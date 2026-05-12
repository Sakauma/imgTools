import { createCanvas } from "./canvas.js";
import { clamp, toPositiveInteger } from "./geometry.js";

/** @typedef {import("./types.js").Layer} Layer */
/** @typedef {import("./types.js").TextLayer} TextLayer */
/** @typedef {import("./types.js").ShapeLayer} ShapeLayer */
/** @typedef {import("./types.js").PaintLayer} PaintLayer */

export const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "hard-light", "difference"];

const BLEND_TO_COMPOSITE = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "hard-light": "hard-light",
  difference: "difference",
};

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

function normalizeBaseLayer(layer, index = 0) {
  const type = ["shape", "paint"].includes(layer.type) ? layer.type : "text";
  return {
    id: String(layer.id || `layer-${Date.now()}-${index}`),
    type,
    x: clamp(Number(layer.x) || 50, 0, 100),
    y: clamp(Number(layer.y) || 50, 0, 100),
    width: clamp(Number(layer.width) || (type === "paint" ? 100 : 36), 4, 100),
    height: clamp(Number(layer.height) || (type === "paint" ? 100 : 18), 4, 100),
    rotation: clamp(Number(layer.rotation) || 0, -180, 180),
    opacity: clamp(Number(layer.opacity ?? 100), 0, 100),
    blendMode: BLEND_MODES.includes(layer.blendMode) ? layer.blendMode : "normal",
    visible: layer.visible !== false,
    zIndex: Number.isFinite(Number(layer.zIndex)) ? Number(layer.zIndex) : index,
  };
}

/** @returns {TextLayer} */
export function createTextLayer(overrides = {}) {
  return {
    id: `text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "text",
    x: 72,
    y: 50,
    width: 34,
    height: 18,
    rotation: -90,
    opacity: 100,
    blendMode: "multiply",
    visible: true,
    zIndex: 10,
    text: "PANICHIYO",
    fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
    fontSize: 72,
    fontWeight: 900,
    italic: true,
    letterSpacing: 0,
    lineHeight: 1,
    color: "#111111",
    ...overrides,
  };
}

/** @returns {ShapeLayer} */
export function createShapeLayer(overrides = {}) {
  return {
    id: `shape-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "shape",
    x: 18,
    y: 14,
    width: 16,
    height: 7,
    rotation: -18,
    opacity: 92,
    blendMode: "multiply",
    visible: true,
    zIndex: 20,
    shape: "rect",
    fillColor: "#d21919",
    strokeColor: "#111111",
    strokeWidth: 0,
    ...overrides,
  };
}

/** @returns {PaintLayer} */
export function createPaintLayer(overrides = {}) {
  return {
    id: `paint-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "paint",
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 100,
    blendMode: "normal",
    visible: true,
    zIndex: 30,
    strokes: [],
    ...overrides,
  };
}

function normalizePaintPoint(point = {}) {
  return {
    x: clamp(Number(point.x) || 0, 0, 100),
    y: clamp(Number(point.y) || 0, 0, 100),
  };
}

function normalizePaintStroke(stroke = {}) {
  const points = Array.isArray(stroke.points)
    ? stroke.points.map(normalizePaintPoint).slice(0, 4_000)
    : [];

  return {
    points,
    color: isHexColor(stroke.color) ? stroke.color : "#111111",
    size: clamp(Number(stroke.size) || 18, 1, 180),
    opacity: clamp(Number(stroke.opacity ?? 100), 0, 100),
    mode: stroke.mode === "erase" ? "erase" : "paint",
  };
}

/** @returns {Layer} */
export function normalizeLayer(layer = {}, index = 0) {
  const base = normalizeBaseLayer(layer, index);
  if (base.type === "shape") {
    return {
      ...base,
      shape: "rect",
      fillColor: isHexColor(layer.fillColor) ? layer.fillColor : "#d21919",
      strokeColor: isHexColor(layer.strokeColor) ? layer.strokeColor : "#111111",
      strokeWidth: clamp(Number(layer.strokeWidth) || 0, 0, 80),
    };
  }

  if (base.type === "paint") {
    return {
      ...base,
      strokes: Array.isArray(layer.strokes) ? layer.strokes.map(normalizePaintStroke) : [],
    };
  }

  return {
    ...base,
    text: String(layer.text ?? "TEXT"),
    fontFamily: String(layer.fontFamily || "Impact, Haettenschweiler, 'Arial Black', sans-serif"),
    fontSize: clamp(Number(layer.fontSize) || 72, 8, 320),
    fontWeight: clamp(toPositiveInteger(layer.fontWeight, 900), 100, 1000),
    italic: Boolean(layer.italic),
    letterSpacing: clamp(Number(layer.letterSpacing) || 0, -20, 80),
    lineHeight: clamp(Number(layer.lineHeight) || 1, 0.6, 3),
    color: isHexColor(layer.color) ? layer.color : "#111111",
  };
}

export function normalizeLayers(layers = []) {
  return layers
    .map((layer, index) => normalizeLayer(layer, index))
    .sort((left, right) => left.zIndex - right.zIndex);
}

export function getLayerSummary(layers = []) {
  const normalized = normalizeLayers(layers).filter((layer) => layer.visible);
  const textCount = normalized.filter((layer) => layer.type === "text").length;
  const shapeCount = normalized.filter((layer) => layer.type === "shape").length;
  const paintCount = normalized.filter((layer) => layer.type === "paint").length;
  if (!normalized.length) {
    return "无图层";
  }

  const parts = [`图层 ${normalized.length} 个`, `文字 ${textCount}`, `色块 ${shapeCount}`];
  if (paintCount > 0) {
    parts.push(`绘画 ${paintCount}`);
  }
  return parts.join(" · ");
}

function prepareLayerContext(context, canvas, layer) {
  const x = (layer.x / 100) * canvas.width;
  const y = (layer.y / 100) * canvas.height;
  const width = (layer.width / 100) * canvas.width;
  const height = (layer.height / 100) * canvas.height;

  context.save();
  context.globalAlpha = layer.opacity / 100;
  context.globalCompositeOperation = BLEND_TO_COMPOSITE[layer.blendMode] || "source-over";
  context.translate(x, y);
  context.rotate((layer.rotation * Math.PI) / 180);
  return { width, height };
}

function drawTextLayer(context, canvas, layer) {
  const { width, height } = prepareLayerContext(context, canvas, layer);
  const fontStyle = layer.italic ? "italic" : "normal";
  context.fillStyle = layer.color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;

  const lines = String(layer.text).split("\n");
  const lineHeight = layer.fontSize * layer.lineHeight;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, lineIndex) => {
    if (!layer.letterSpacing) {
      context.fillText(line, 0, startY + lineIndex * lineHeight, width);
      return;
    }

    const chars = [...line];
    const totalWidth = chars.reduce((sum, char) => sum + context.measureText(char).width, 0) +
      Math.max(0, chars.length - 1) * layer.letterSpacing;
    let cursor = -totalWidth / 2;
    chars.forEach((char) => {
      const charWidth = context.measureText(char).width;
      context.fillText(char, cursor + charWidth / 2, startY + lineIndex * lineHeight);
      cursor += charWidth + layer.letterSpacing;
    });
  });
  context.restore();
}

function drawShapeLayer(context, canvas, layer) {
  const { width, height } = prepareLayerContext(context, canvas, layer);
  context.fillStyle = layer.fillColor;
  context.fillRect(-width / 2, -height / 2, width, height);
  if (layer.strokeWidth > 0) {
    context.lineWidth = layer.strokeWidth;
    context.strokeStyle = layer.strokeColor;
    context.strokeRect(-width / 2, -height / 2, width, height);
  }
  context.restore();
}

function drawPaintLayer(context, canvas, layer) {
  const paintCanvas = createCanvas(canvas.width, canvas.height);
  const paintContext = paintCanvas.getContext("2d");
  paintContext.lineCap = "round";
  paintContext.lineJoin = "round";

  layer.strokes.forEach((stroke) => {
    if (stroke.points.length === 0 || stroke.opacity <= 0 || stroke.size <= 0) {
      return;
    }

    paintContext.save();
    paintContext.globalAlpha = stroke.opacity / 100;
    paintContext.globalCompositeOperation = stroke.mode === "erase" ? "destination-out" : "source-over";
    paintContext.strokeStyle = stroke.color;
    paintContext.lineWidth = stroke.size;
    paintContext.beginPath();
    const [firstPoint, ...restPoints] = stroke.points;
    const startX = (firstPoint.x / 100) * canvas.width;
    const startY = (firstPoint.y / 100) * canvas.height;
    paintContext.moveTo(startX, startY);

    if (restPoints.length === 0) {
      paintContext.lineTo(startX + 0.01, startY + 0.01);
    } else {
      restPoints.forEach((point) => {
        paintContext.lineTo((point.x / 100) * canvas.width, (point.y / 100) * canvas.height);
      });
    }

    paintContext.stroke();
    paintContext.restore();
  });

  context.save();
  context.globalAlpha = layer.opacity / 100;
  context.globalCompositeOperation = BLEND_TO_COMPOSITE[layer.blendMode] || "source-over";
  context.drawImage(paintCanvas, 0, 0);
  context.restore();
}

export function renderLayersToCanvas(sourceCanvas, layers = []) {
  const normalized = normalizeLayers(layers).filter((layer) => layer.visible && layer.opacity > 0);
  if (!normalized.length) {
    return sourceCanvas;
  }

  const canvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
  const context = canvas.getContext("2d");
  context.drawImage(sourceCanvas, 0, 0);
  normalized.forEach((layer) => {
    if (layer.type === "shape") {
      drawShapeLayer(context, canvas, layer);
    } else if (layer.type === "paint") {
      drawPaintLayer(context, canvas, layer);
    } else {
      drawTextLayer(context, canvas, layer);
    }
  });
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  return canvas;
}
