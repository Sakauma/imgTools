/** @typedef {HTMLCanvasElement | OffscreenCanvas} CanvasLike */
/** @typedef {(width: number, height: number) => CanvasLike} CanvasFactory */

/** @type {CanvasFactory | null} */
let activeCanvasFactory = null;

/** @type {CanvasFactory} */
function defaultCanvasFactory(width, height) {
  if (typeof document !== "undefined" && document.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  throw new Error("No canvas factory is available in this environment.");
}

/**
 * Creates an offscreen canvas through the active factory.
 * Tests can replace this without mutating global document.
 *
 * @param {number} width
 * @param {number} height
 * @returns {CanvasLike}
 */
export function createCanvas(width, height) {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  const canvas = (activeCanvasFactory ?? defaultCanvasFactory)(safeWidth, safeHeight);
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  return canvas;
}

/**
 * @param {{ width: number, height: number }} sourceCanvas
 * @param {number} [width]
 * @param {number} [height]
 * @returns {CanvasLike}
 */
export function createCanvasLike(sourceCanvas, width = sourceCanvas.width, height = sourceCanvas.height) {
  return createCanvas(width, height);
}

/**
 * Returns a 2D rendering context or fails with an actionable error.
 *
 * @param {CanvasLike} canvas
 * @returns {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D}
 */
export function getCanvasContext(canvas) {
  const context = canvas?.getContext?.("2d");
  if (!context) {
    throw new Error("2D canvas context is unavailable in this environment.");
  }
  return context;
}

/**
 * Runs a callback with a temporary canvas factory.
 *
 * @template T
 * @param {CanvasFactory} factory
 * @param {() => T} callback
 * @returns {T}
 */
export function withCanvasFactory(factory, callback) {
  const previousFactory = activeCanvasFactory;
  activeCanvasFactory = factory;
  try {
    return callback();
  } finally {
    activeCanvasFactory = previousFactory;
  }
}
