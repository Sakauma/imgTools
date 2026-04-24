import { clamp } from "./geometry.js";

export const EFFECT_LIMITS = {
  threshold: { min: 0, max: 100, step: 1 },
  paperLift: { min: 0, max: 100, step: 1 },
  lineFade: { min: 0, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
  paperTexture: { min: 0, max: 100, step: 1 },
  halftone: { min: 0, max: 100, step: 1 },
};

export function createDefaultEffects() {
  return {
    grayscale: false,
    threshold: 0,
    paperLift: 0,
    lineFade: 0,
    grain: 0,
    paperTexture: 0,
    halftone: 0,
  };
}

export function normalizeEffects(effects = {}) {
  const normalized = createDefaultEffects();
  normalized.grayscale = Boolean(effects.grayscale);
  Object.entries(EFFECT_LIMITS).forEach(([key, limits]) => {
    normalized[key] = clamp(Number(effects[key]) || 0, limits.min, limits.max);
  });
  return normalized;
}

export function hasActiveEffects(effects = {}) {
  const normalized = normalizeEffects(effects);
  return (
    normalized.grayscale ||
    normalized.threshold > 0 ||
    normalized.paperLift > 0 ||
    normalized.lineFade > 0 ||
    normalized.grain > 0 ||
    normalized.paperTexture > 0 ||
    normalized.halftone > 0
  );
}

export function getEffectsSummary(effects = {}) {
  const normalized = normalizeEffects(effects);
  const labels = [];
  if (normalized.grayscale) labels.push("灰度");
  if (normalized.threshold > 0) labels.push("阈值");
  if (normalized.paperLift > 0) labels.push("纸张提亮");
  if (normalized.lineFade > 0) labels.push("线稿淡化");
  if (normalized.grain > 0) labels.push("颗粒");
  if (normalized.paperTexture > 0) labels.push("纸纹");
  if (normalized.halftone > 0) labels.push("半调");
  return labels.length ? labels.slice(0, 3).join(" · ") + (labels.length > 3 ? ` · 等 ${labels.length} 项` : "") : "无扫描效果";
}

function nextNoise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clampChannel(value) {
  return clamp(Math.round(value), 0, 255);
}

function createCanvasLike(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  return canvas;
}

export function applyPosterEffectsToCanvas(sourceCanvas, effects = {}) {
  const normalized = normalizeEffects(effects);
  if (!hasActiveEffects(normalized)) {
    return sourceCanvas;
  }

  const canvas = createCanvasLike(sourceCanvas);
  const context = canvas.getContext("2d");
  context.drawImage(sourceCanvas, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const thresholdCutoff = 255 - normalized.threshold * 1.8;
  const paperLift = normalized.paperLift * 1.45;
  const lineFade = normalized.lineFade / 100;
  const grainAmount = normalized.grain * 0.75;
  const paperTextureAmount = normalized.paperTexture * 0.45;
  const halftoneStrength = normalized.halftone / 100;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % canvas.width;
    const y = Math.floor(pixel / canvas.width);
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];
    let luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

    if (normalized.grayscale || normalized.threshold > 0 || normalized.lineFade > 0) {
      red = luminance;
      green = luminance;
      blue = luminance;
    }

    if (normalized.threshold > 0) {
      const poster = luminance > thresholdCutoff ? 255 : luminance * (1 - normalized.threshold / 140);
      red = red * (1 - normalized.threshold / 100) + poster * (normalized.threshold / 100);
      green = green * (1 - normalized.threshold / 100) + poster * (normalized.threshold / 100);
      blue = blue * (1 - normalized.threshold / 100) + poster * (normalized.threshold / 100);
    }

    if (normalized.lineFade > 0) {
      const fade = luminance < 190 ? lineFade * 88 : 0;
      red += fade;
      green += fade;
      blue += fade;
    }

    if (normalized.paperLift > 0) {
      red += paperLift;
      green += paperLift;
      blue += paperLift;
    }

    if (normalized.halftone > 0) {
      const cell = 8;
      const centerX = (Math.floor(x / cell) + 0.5) * cell;
      const centerY = (Math.floor(y / cell) + 0.5) * cell;
      const distance = Math.hypot(x - centerX, y - centerY) / (cell / 2);
      const dot = distance < (1 - luminance / 255) * halftoneStrength ? -46 * halftoneStrength : 0;
      red += dot;
      green += dot;
      blue += dot;
    }

    if (normalized.paperTexture > 0) {
      const wave = Math.sin(x * 0.075) + Math.cos(y * 0.055);
      red += wave * paperTextureAmount;
      green += wave * paperTextureAmount;
      blue += wave * paperTextureAmount;
    }

    if (normalized.grain > 0) {
      const noise = (nextNoise(pixel + canvas.width * 17) - 0.5) * grainAmount;
      red += noise;
      green += noise;
      blue += noise;
    }

    data[index] = clampChannel(red);
    data[index + 1] = clampChannel(green);
    data[index + 2] = clampChannel(blue);
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}
