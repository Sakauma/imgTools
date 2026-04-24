import { clamp, toPositiveInteger } from "./geometry.js";

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
  return {
    id: String(layer.id || `layer-${Date.now()}-${index}`),
    type: layer.type === "shape" ? "shape" : "text",
    x: clamp(Number(layer.x) || 50, 0, 100),
    y: clamp(Number(layer.y) || 50, 0, 100),
    width: clamp(Number(layer.width) || 36, 4, 100),
    height: clamp(Number(layer.height) || 18, 4, 100),
    rotation: clamp(Number(layer.rotation) || 0, -180, 180),
    opacity: clamp(Number(layer.opacity ?? 100), 0, 100),
    blendMode: BLEND_MODES.includes(layer.blendMode) ? layer.blendMode : "normal",
    visible: layer.visible !== false,
    zIndex: Number.isFinite(Number(layer.zIndex)) ? Number(layer.zIndex) : index,
  };
}

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
  if (!normalized.length) {
    return "无图层";
  }
  return `图层 ${normalized.length} 个 · 文字 ${textCount} · 色块 ${shapeCount}`;
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

export function renderLayersToCanvas(sourceCanvas, layers = []) {
  const normalized = normalizeLayers(layers).filter((layer) => layer.visible && layer.opacity > 0);
  if (!normalized.length) {
    return sourceCanvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const context = canvas.getContext("2d");
  context.drawImage(sourceCanvas, 0, 0);
  normalized.forEach((layer) => {
    if (layer.type === "shape") {
      drawShapeLayer(context, canvas, layer);
    } else {
      drawTextLayer(context, canvas, layer);
    }
  });
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  return canvas;
}
