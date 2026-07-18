/* ===== 共享类型定义 ===== */

/** 应用状态枚举 */
export type AppStatus =
  | 'loading-opencv'   // 加载 OpenCV.js 中
  | 'idle'             // 就绪，等待用户上传
  | 'image-loaded'     // 图片已加载
  | 'color-picked'     // 已取色
  | 'processing'       // 处理中
  | 'ready';           // 处理完成，可下载

/** 处理历史条目 */
export interface HistoryEntry {
  index: number;
  inputName: string;
  outputBlob: Blob;
}

/** 应用全局状态 */
export interface AppState {
  status: AppStatus;
  files: File[];
  currentIndex: number;
  selectedColor: RgbColor | null;
  tolerance: number;
  history: HistoryEntry[];
  zoom: number;
  panX: number;
  panY: number;
}

/** RGB 颜色元组 */
export type RgbColor = [number, number, number];

/** Canvas 交互模式 */
export type CanvasMode = 'pick-color' | 'pan';
