/* ===== OpenCV.js 全局类型声明 ===== */

declare namespace cv {
  // ── 核心类型 ──
  class Mat {
    rows: number;
    cols: number;
    type: number;
    data: Uint8Array;
    data8S: Int8Array;
    data16S: Int16Array;
    data16U: Uint16Array;
    data32S: Int32Array;
    data32F: Float32Array;
    data64F: Float64Array;
    constructor();
    constructor(rows: number, cols: number, type: number);
    constructor(rows: number, cols: number, type: number, init: Scalar);
    delete(): void;
    clone(): Mat;
    convertTo(m: Mat, rtype: number, alpha?: number, beta?: number): void;
  }

  class MatVector {
    size(): number;
    get(i: number): Mat;
    delete(): void;
  }

  class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
  }

  class Size {
    width: number;
    height: number;
    constructor(w: number, h: number);
  }

  class Scalar {
    val: number[];
    constructor(...vals: number[]);
  }

  interface RotatedRect {
    center: Point;
    size: Size;
    angle: number;
  }

  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  // ── 枚举常量 ──
  const CV_8UC3: number;
  const CV_8U: number;
  const CV_32F: number;
  const CV_32SC1: number;

  const RETR_EXTERNAL: number;
  const CHAIN_APPROX_SIMPLE: number;

  const INTER_LANCZOS4: number;
  const INTER_LINEAR: number;
  const BORDER_CONSTANT: number;

  const COLOR_BGR2RGB: number;

  // ── 函数 ──
  function inRange(src: Mat, lower: Mat, upper: Mat, dst: Mat): void;
  function bitwise_not(src: Mat, dst: Mat): void;
  function findContours(
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number,
  ): void;
  function contourArea(contour: Mat): number;
  function minAreaRect(points: Mat): RotatedRect;
  function boxPoints(rect: RotatedRect, points: Mat): void;
  function boundingRect(points: Mat): Rect;
  function getRotationMatrix2D(center: Point, angle: number, scale: number): Mat;
  function warpAffine(
    src: Mat,
    dst: Mat,
    M: Mat,
    dsize: Size,
    flags?: number,
    borderMode?: number,
    borderValue?: Scalar,
  ): void;
  function gemm(
    src1: Mat,
    src2: Mat,
    alpha: number,
    src3: Mat,
    beta: number,
    dst: Mat,
    flags?: number,
  ): void;
  function hconcat(src: Mat[], dst: Mat): void;
  function hconcat(src1: Mat, src2: Mat, dst: Mat): void;
  function transpose(src: Mat, dst: Mat): void;
  function imread(src: HTMLCanvasElement | HTMLImageElement): Mat;
  function imshow(canvas: HTMLCanvasElement, mat: Mat): void;
  function imencode(ext: string, mat: Mat, dst: Mat): boolean;
  function resize(
    src: Mat,
    dst: Mat,
    dsize: Size,
    fx?: number,
    fy?: number,
    interpolation?: number,
  ): void;
  function cvtColor(src: Mat, dst: Mat, code: number): void;
}

/** OpenCV.js 加载完成后的全局回调 */
interface Window {
  onOpenCvReady?: () => void;
}
