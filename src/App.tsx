/* ===== 根组件：应用状态管理 + 事件协调 ===== */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ImageCanvas from './components/ImageCanvas';
import ControlPanel from './components/ControlPanel';
import { loadOpenCV } from './utils/opencv';
import {
  createMask,
  findLargestContour,
  straightenAndCrop,
  matToBlob,
} from './utils/processing';
import type { RgbColor, AppStatus, HistoryEntry } from './types';

// ── 常量 ──
const STATUS_MAP: Record<AppStatus, string> = {
  'loading-opencv': '正在加载 OpenCV.js（首次约 5-10 秒）…',
  idle: '上传图片开始处理',
  'image-loaded': '点击背景区域取色',
  'color-picked': '调节容差或直接确认',
  processing: '处理中…',
  ready: '处理完成，可下载',
};

const App: React.FC = () => {
  // ── 状态 ──
  const [status, setStatus] = useState<AppStatus>('loading-opencv');
  const [files, setFiles] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<RgbColor | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // ── 非状态 ──
  const originalMatRef = useRef<cv.Mat | null>(null);
  const contourRef = useRef<cv.Mat | null>(null);
  const displaySrcRef = useRef<ImageBitmap | HTMLImageElement | null>(null);

  // 用于重绘预览框的信号
  const [refreshTick, setRefreshTick] = useState(0);
  const [previewBoxPoints, setPreviewBoxPoints] = useState<[number, number][] | null>(null);
  const [showPreviewBox, setShowPreviewBox] = useState(false);

  // ── OpenCV.js 初始化 ──
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        setStatus('idle');
      })
      .catch((err) => {
        alert(`OpenCV.js 加载失败: ${err.message}`);
      });
  }, []);

  // ── 加载图片 → cv.Mat ──
  const loadFileAsMat = useCallback(async (file: File): Promise<cv.Mat> => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const mat = (window as any).cv.imread(canvas);
    return mat;
  }, []);

  // ── 文件上传 ──
  const handleFilesUpload = useCallback(async (newFiles: FileList) => {
    const fileArray = Array.from(newFiles).filter((f) =>
      /\.(jpg|jpeg|png|bmp|webp|tiff?)$/i.test(f.name),
    );
    if (fileArray.length === 0) return;

    setFiles(fileArray);
    setCurrentIndex(0);
    setSelectedColor(null);
    setContourRef(null);
    setPreviewBoxPoints(null);
    setShowPreviewBox(false);

    // 加载第一张
    setStatus('processing');
    try {
      const mat = await loadFileAsMat(fileArray[0]);
      // 释放旧的 mat
      if (originalMatRef.current) originalMatRef.current.delete();
      originalMatRef.current = mat;

      // 创建显示用的 ImageBitmap
      const blob = new Blob([fileArray[0]], { type: fileArray[0].type });
      const bitmap = await createImageBitmap(blob);
      displaySrcRef.current = bitmap;
      setRefreshTick((t) => t + 1);

      setStatus('image-loaded');
    } catch (err) {
      console.error('图片加载失败:', err);
      setStatus('idle');
    }
  }, [loadFileAsMat]);

  // ── 取色 ──
  const handlePickColor = useCallback((canvasX: number, canvasY: number) => {
    if (!originalMatRef.current || status === 'loading-opencv') return;

    const mat = originalMatRef.current;
    // 将 canvas 坐标转为图像坐标
    const imgX = Math.floor((canvasX - panX) / zoom);
    const imgY = Math.floor((canvasY - panY) / zoom);

    if (imgX < 0 || imgX >= mat.cols || imgY < 0 || imgY >= mat.rows) return;

    // 读取像素（OpenCV BGR → RGB）
    const pixel = mat.data8S ?? mat.data;
    // 注意：OpenCV Mat 的 step 可能是 width*channels
    const channels = 3;
    const idx = (imgY * mat.cols + imgX) * channels;
    const b = pixel[idx] & 0xff;
    const g = pixel[idx + 1] & 0xff;
    const r = pixel[idx + 2] & 0xff;

    const color: RgbColor = [r, g, b];
    setSelectedColor(color);
    setStatus('color-picked');
  }, [status, zoom, panX, panY]);

  // ── 容差变化 → 自动重新计算轮廓 ──
  const handleToleranceChange = useCallback((val: number) => {
    setTolerance(val);
    // 如果有选中的颜色，重新计算
    if (selectedColor && originalMatRef.current) {
      computeContour(val);
    }
  }, [selectedColor]);

  const setContourRef = useCallback((contour: cv.Mat | null) => {
    if (contourRef.current) contourRef.current.delete();
    contourRef.current = contour;
  }, []);

  const computeContour = useCallback((tol: number) => {
    if (!selectedColor || !originalMatRef.current) return;
    const mat = originalMatRef.current;

    const mask = createMask(mat, selectedColor, tol);
    const contour = findLargestContour(mask);
    mask.delete();

    setContourRef(contour);
    setShowPreviewBox(!!contour);

    if (contour) {
      // 计算预览框的四个角（canvas 坐标）
      const rect = (window as any).cv.minAreaRect(contour);
      const boxMat = new (window as any).cv.Mat();
      (window as any).cv.boxPoints(rect, boxMat);

      const points: [number, number][] = [];
      for (let i = 0; i < 4; i++) {
        const x = boxMat.data32S ? boxMat.data32S[i * 2] : boxMat.data32F[i * 2];
        const y = boxMat.data32S ? boxMat.data32S[i * 2 + 1] : boxMat.data32F[i * 2 + 1];
        points.push([x * zoom + panX, y * zoom + panY]);
      }
      boxMat.delete();
      setPreviewBoxPoints(points);
    } else {
      setPreviewBoxPoints(null);
    }

    setRefreshTick((t) => t + 1);
  }, [selectedColor, zoom, panX, panY, setContourRef]);

  // ── 预览 ──
  const handlePreview = useCallback(() => {
    if (!contourRef.current || !originalMatRef.current) return;
    const result = straightenAndCrop(originalMatRef.current, contourRef.current);
    // 弹出新窗口显示
    const canvas = document.createElement('canvas');
    canvas.width = result.cols;
    canvas.height = result.rows;
    (window as any).cv.imshow(canvas, result);
    const win = window.open('', '_blank', 'width=800,height=600');
    win?.document.write(
      `<html><body style="margin:0"><img src="${canvas.toDataURL()}"/></body></html>`,
    );
    result.delete();
  }, []);

  // ── 确认并下一张 ──
  const handleConfirm = useCallback(async () => {
    if (!contourRef.current || !originalMatRef.current) return;

    setStatus('processing');
    const result = straightenAndCrop(originalMatRef.current, contourRef.current);

    try {
      const blob = await matToBlob(result);
      history.push({
        index: currentIndex,
        inputName: files[currentIndex]?.name ?? 'unknown',
        outputBlob: blob,
      });
      setHistory([...history]);
      result.delete();
    } catch (err) {
      console.error('处理失败:', err);
      result.delete();
      setStatus('ready');
      return;
    }

    // 下一张
    const nextIdx = currentIndex + 1;
    if (nextIdx < files.length) {
      setCurrentIndex(nextIdx);
      setSelectedColor(null);
      setContourRef(null);
      setPreviewBoxPoints(null);
      setShowPreviewBox(false);

      try {
        const mat = await loadFileAsMat(files[nextIdx]);
        if (originalMatRef.current) originalMatRef.current.delete();
        originalMatRef.current = mat;

        const blob = new Blob([files[nextIdx]], { type: files[nextIdx].type });
        const bitmap = await createImageBitmap(blob);
        displaySrcRef.current = bitmap;
        setRefreshTick((t) => t + 1);

        setStatus('image-loaded');
      } catch (err) {
        console.error('加载下一张失败:', err);
        setStatus('idle');
      }
    } else {
      setStatus('ready');
    }
  }, [contourRef, originalMatRef, currentIndex, files, history, loadFileAsMat]);

  // ── 跳过 ──
  const handleSkip = useCallback(async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= files.length) {
      setStatus('ready');
      return;
    }

    setCurrentIndex(nextIdx);
    setSelectedColor(null);
    setContourRef(null);
    setPreviewBoxPoints(null);
    setShowPreviewBox(false);

    try {
      const mat = await loadFileAsMat(files[nextIdx]);
      if (originalMatRef.current) originalMatRef.current.delete();
      originalMatRef.current = mat;

      const blob = new Blob([files[nextIdx]], { type: files[nextIdx].type });
      const bitmap = await createImageBitmap(blob);
      displaySrcRef.current = bitmap;
      setRefreshTick((t) => t + 1);

      setStatus('image-loaded');
    } catch (err) {
      console.error('加载跳过图片失败:', err);
      setStatus('idle');
    }
  }, [currentIndex, files, loadFileAsMat]);

  // ── 撤销 ──
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    // 简单地移除最后一条记录
    setHistory(history.slice(0, -1));
  }, [history]);

  // ── 下载全部 ──
  const handleDownloadAll = useCallback(() => {
    history.forEach((entry) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(entry.outputBlob);
      link.download = `deskewed_${entry.inputName}`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }, [history]);

  // ── 视角控制 ──
  const handleZoom = useCallback((delta: number, _clientX: number, _clientY: number) => {
    // 简易缩放：以鼠标为中心
    const factor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.05, Math.min(10, zoom * factor));
    setZoom(newZoom);
    setRefreshTick((t) => t + 1);
  }, [zoom]);

  const panStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    panStartRef.current = { x: clientX, y: clientY, startPanX: panX, startPanY: panY };
  }, [panX, panY]);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    setPanX(panStartRef.current.startPanX + dx);
    setPanY(panStartRef.current.startPanY + dy);
    setRefreshTick((t) => t + 1);
  }, []);

  // ── 拖拽上传处理 ──
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  }, [handleFilesUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  }, [handleFilesUpload]);

  // ── 渲染 ──
  return (
    <div className="flex flex-col h-screen bg-base-300">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-content/10">
        <h1 className="text-lg font-bold">🖼️ Img Deskewing</h1>
        <span className="text-sm opacity-70">{STATUS_MAP[status]}</span>
        {history.length > 0 && status === 'ready' && (
          <button className="btn btn-primary btn-sm" onClick={handleDownloadAll}>
            ⬇️ 下载全部 ({history.length})
          </button>
        )}
      </header>

      {/* 上传区（无图片时显示） */}
      {status === 'idle' && (
        <div
          className={`flex flex-col items-center justify-center flex-1 m-4 rounded-box border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-base-content/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-4xl mb-4">📁</div>
          <p className="text-lg mb-2">拖拽图片到此处，或点击选择文件</p>
          <p className="text-sm opacity-60 mb-4">支持 JPG / PNG / BMP / WebP / TIFF</p>
          <label className="btn btn-primary">
            选择图片
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/bmp,image/webp,image/tiff"
              className="hidden"
              onChange={handleInputChange}
            />
          </label>
        </div>
      )}

      {/* 加载 OpenCV.js */}
      {status === 'loading-opencv' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-lg">{STATUS_MAP['loading-opencv']}</p>
        </div>
      )}

      {/* 主工作区 */}
      {(status === 'image-loaded' || status === 'color-picked' || status === 'processing' || status === 'ready') && (
        <div className="flex flex-col flex-1 gap-2 p-2 min-h-0">
          {/* Canvas 区域 */}
          <div className="flex-1 min-h-0">
            <ImageCanvas
              key={refreshTick}
              displaySrc={displaySrcRef.current}
              showPreviewBox={showPreviewBox}
              previewBoxPoints={previewBoxPoints}
              zoom={zoom}
              panX={panX}
              panY={panY}
              onPickColor={handlePickColor}
              onZoom={handleZoom}
              onPanStart={handlePanStart}
              onPanMove={handlePanMove}
            />
          </div>

          {/* 底部控制栏 */}
          <ControlPanel
            selectedColor={selectedColor}
            tolerance={tolerance}
            hasContour={showPreviewBox}
            onToleranceChange={handleToleranceChange}
            onPreview={handlePreview}
            onConfirm={handleConfirm}
            onSkip={handleSkip}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            currentIndex={currentIndex}
            totalCount={files.length}
          />
        </div>
      )}
    </div>
  );
};

export default App;
