/* ===== Canvas 交互组件 ===== */

import React, { useRef, useEffect, useCallback } from 'react';

interface ImageCanvasProps {
  /** 用于显示的 Canvas 画布数据（ImageData 或 HTMLImageElement） */
  displaySrc: ImageBitmap | HTMLImageElement | null;
  /** 是否显示青色预览框 */
  showPreviewBox: boolean;
  /** 预览框四个角（canvas 坐标） */
  previewBoxPoints: [number, number][] | null;
  /** 缩放级别 */
  zoom: number;
  /** 平移 X */
  panX: number;
  /** 平移 Y */
  panY: number;
  /** 取色回调 */
  onPickColor: (canvasX: number, canvasY: number) => void;
  /** 缩放回调 */
  onZoom: (delta: number, clientX: number, clientY: number) => void;
  /** 平移开始 */
  onPanStart: (clientX: number, clientY: number) => void;
  /** 平移移动 */
  onPanMove: (clientX: number, clientY: number) => void;
}

const CANVAS_BG = '#404040';
const PREVIEW_COLOR = '#00FFFF';
const PREVIEW_WIDTH = 2;

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  displaySrc,
  showPreviewBox,
  previewBoxPoints,
  zoom,
  panX,
  panY,
  onPickColor,
  onZoom,
  onPanStart,
  onPanMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 绘制 ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!displaySrc) return;

    // 绘制图片
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    if (displaySrc instanceof ImageBitmap) {
      ctx.drawImage(displaySrc, 0, 0);
    } else {
      ctx.drawImage(displaySrc, 0, 0);
    }
    ctx.restore();

    // 绘制预览框
    if (showPreviewBox && previewBoxPoints && previewBoxPoints.length === 4) {
      ctx.save();
      ctx.strokeStyle = PREVIEW_COLOR;
      ctx.lineWidth = PREVIEW_WIDTH;
      ctx.beginPath();
      ctx.moveTo(previewBoxPoints[0][0], previewBoxPoints[0][1]);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(previewBoxPoints[i][0], previewBoxPoints[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }, [displaySrc, showPreviewBox, previewBoxPoints, zoom, panX, panY]);

  // ── 调整 canvas 尺寸 ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── 事件处理 ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      // 右键拖拽平移
      onPanStart(e.clientX, e.clientY);
    } else if (e.button === 0) {
      // 左键取色
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        onPickColor(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  }, [onPickColor, onPanStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 2) {
      // 右键按住拖拽
      onPanMove(e.clientX, e.clientY);
    }
  }, [onPanMove]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    onZoom(e.deltaY, e.clientX, e.clientY);
  }, [onZoom]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // 阻止右键菜单
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-box bg-base-300"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export default ImageCanvas;
