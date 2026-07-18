/* ===== 核心图像处理（OpenCV.js 封装层） ===== */

import type { RgbColor } from '../types';

// ── 模块级常量 ──
const MIN_CONTOUR_AREA = 50;   // 最小有效轮廓面积
const BORDER_VALUE = 255;      // 填充色（白）

/**
 * 创建颜色容差 mask。
 * 选中背景色后，在容差范围内生成 mask，再反色得到前景。
 */
export function createMask(
  img: cv.Mat,
  color: RgbColor,
  tolerance: number,
): cv.Mat {
  const lower = new cv.Mat(img.rows, img.cols, cv.CV_8UC3,
    new cv.Scalar(
      Math.max(0, color[2] - tolerance),   // B
      Math.max(0, color[1] - tolerance),   // G
      Math.max(0, color[0] - tolerance),   // R
    ),
  );
  const upper = new cv.Mat(img.rows, img.cols, cv.CV_8UC3,
    new cv.Scalar(
      Math.min(255, color[2] + tolerance),
      Math.min(255, color[1] + tolerance),
      Math.min(255, color[0] + tolerance),
    ),
  );

  const mask = new cv.Mat();
  cv.inRange(img, lower, upper, mask);

  // 反色：mask 中背景为白，前景为黑 → 反转后前景为白
  cv.bitwise_not(mask, mask);

  lower.delete();
  upper.delete();

  return mask;
}

/**
 * 从 mask 中提取面积最大的轮廓。
 * 返回 null 表示未找到有效轮廓。
 */
export function findLargestContour(mask: cv.Mat): cv.Mat | null {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  hierarchy.delete();

  const len = contours.size();
  if (len === 0) {
    contours.delete();
    return null;
  }

  // 找面积最大的轮廓
  let bestIdx = 0;
  let bestArea = cv.contourArea(contours.get(0));

  for (let i = 1; i < len; i++) {
    const area = cv.contourArea(contours.get(i));
    if (area > bestArea) {
      bestArea = area;
      bestIdx = i;
    }
  }

  if (bestArea < MIN_CONTOUR_AREA) {
    contours.delete();
    return null;
  }

  // 复制最大轮廓
  const best = contours.get(bestIdx).clone();

  // 清理其他 contour
  for (let i = 0; i < len; i++) {
    if (i !== bestIdx) contours.get(i).delete();
  }
  contours.delete();

  return best;
}

/**
 * 核心拉直 + 裁剪。
 * 逻辑与 Python 版 processing.py 一致：
 *   1. minAreaRect 求最小外接矩形
 *   2. 角度归一化到 [-45, 45]
 *   3. 计算旋转矩阵
 *   4. 变换轮廓 → boundingRect
 *   5. 单次 warpAffine 完成旋转+裁剪
 */
export function straightenAndCrop(image: cv.Mat, contour: cv.Mat): cv.Mat {
  // 1. 最小外接矩形
  const rect = cv.minAreaRect(contour);
  let w = rect.size.width;
  let h = rect.size.height;
  let angle = rect.angle;

  // 2. 角度归一化到 [-45, 45]
  if (angle < -45) {
    angle += 90;
    const tmp = w;
    w = h;
    h = tmp;
  } else if (angle > 45) {
    angle -= 90;
    const tmp = w;
    w = h;
    h = tmp;
  }

  // 3. 以图像中心为旋转中心
  const imgCenter = new cv.Point(image.cols / 2, image.rows / 2);
  const M = cv.getRotationMatrix2D(imgCenter, angle, 1.0);

  // 4. 变换轮廓 → 计算旋转后的 bounding rect
  //   构造齐次坐标 (x, y, 1) 并乘以旋转矩阵实现轮廓变换
  const contourFloat = new cv.Mat();
  contour.convertTo(contourFloat, cv.CV_32F);

  const ones = new cv.Mat(contourFloat.rows, 1, cv.CV_32F, new cv.Scalar(1));
  const pointsHom = new cv.Mat();
  cv.hconcat(contourFloat, ones, pointsHom);

  // M (2x3) 转置 → MT (3x2)，然后 pointsHom (Nx3) * MT (3x2)
  const MT = new cv.Mat();
  cv.transpose(M, MT);
  const rotated = new cv.Mat();
  cv.gemm(pointsHom, MT, 1, new cv.Mat(), 0, rotated);

  // 清理中间变量
  pointsHom.delete();
  ones.delete();
  contourFloat.delete();
  MT.delete();

  // 计算 bounding rect
  const rotatedRect = cv.boundingRect(rotated);
  let rx = rotatedRect.x;
  let ry = rotatedRect.y;
  let rw = rotatedRect.width;
  let rh = rotatedRect.height;
  rotated.delete();

  // 5. 安全边界
  const maxX = image.cols - 1;
  const maxY = image.rows - 1;
  rx = Math.max(0, Math.min(rx, maxX));
  ry = Math.max(0, Math.min(ry, maxY));
  rw = Math.max(1, Math.min(rw, image.cols - rx));
  rh = Math.max(1, Math.min(rh, image.rows - ry));

  // 6. 合并变换：将平移偏移量编入旋转矩阵
  M.data64F[2] -= rx;   // M[0, 2] -= rx
  M.data64F[5] -= ry;   // M[1, 2] -= ry

  // 7. 单次仿射变换
  const dst = new cv.Mat();
  cv.warpAffine(
    image, dst, M, new cv.Size(rw, rh),
    cv.INTER_LANCZOS4, cv.BORDER_CONSTANT,
    new cv.Scalar(BORDER_VALUE, BORDER_VALUE, BORDER_VALUE),
  );

  M.delete();

  return dst;
}

/**
 * 将 cv.Mat 转为 Blob（用于浏览器下载）。
 */
export function matToBlob(mat: cv.Mat, format: string = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // OpenCV.js 的 imencode 方案
    const ext = format.split('/')[1] || 'png';
    const data = new cv.Mat();
    const success = cv.imencode(`.${ext}`, mat, data);

    if (!success) {
      data.delete();
      reject(new Error(`imencode 失败: .${ext}`));
      return;
    }

    const imgData = new Uint8Array(data.data32S ?? data.data8S ?? data.data);
    const blob = new Blob([imgData], { type: format });
    data.delete();
    resolve(blob);
  });
}

/**
 * 将 HTMLImageElement / HTMLCanvasElement / ImageData 转为 cv.Mat。
 */
export function imageToMat(src: HTMLCanvasElement | HTMLImageElement): cv.Mat {
  return cv.imread(src);
}

/**
 * 将 cv.Mat 绘制到 Canvas 上。
 */
export function drawMatToCanvas(mat: cv.Mat, canvas: HTMLCanvasElement): void {
  cv.imshow(canvas, mat);
}
