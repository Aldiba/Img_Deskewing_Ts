/* ===== OpenCV.js 异步加载器 ===== */

type CvReadyCallback = () => void;

let _cvReadyPromise: Promise<void> | null = null;
let _cvReadyResolve: CvReadyCallback | null = null;

/**
 * OpenCV.js 加载完成后会调用此全局回调。
 * index.html 中 <script async src="opencv.js"> 加载完毕后触发。
 */
;(window as unknown as Record<string, unknown>).onOpenCvReady = () => {
  _cvReadyResolve?.();
};

/**
 * 等待 OpenCV.js 加载完毕。
 * 返回 Promise，resolve 后全局 `cv` 可用。
 */
export function loadOpenCV(): Promise<void> {
  if (_cvReadyPromise) return _cvReadyPromise;

  _cvReadyPromise = new Promise<void>((resolve) => {
    if (hasCV()) {
      resolve();
      return;
    }

    _cvReadyResolve = resolve;

    setTimeout(() => {
      if (!hasCV()) {
        _cvReadyPromise = null;
        rejectOpenCV(new Error('OpenCV.js 加载超时，请检查网络连接。'));
      }
    }, 30_000);
  });

  return _cvReadyPromise;
}

function rejectOpenCV(reason: Error): void {
  _cvReadyPromise = Promise.reject(reason);
}

function hasCV(): boolean {
  return typeof (window as any).cv !== 'undefined';
}
