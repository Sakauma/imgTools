import { clamp } from "./geometry.js";

export const APPEARANCE_LIMITS = {
  cornerRadius: { min: 0, max: 512, step: 1 },
  borderWidth: { min: 0, max: 160, step: 1 },
};

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

export function createDefaultAppearance() {
  return {
    backgroundColor: null,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
  };
}

export function normalizeAppearance(appearance = {}) {
  const defaults = createDefaultAppearance();
  const backgroundColor = isHexColor(appearance.backgroundColor) ? appearance.backgroundColor : null;
  const borderColor = isHexColor(appearance.borderColor) ? appearance.borderColor : defaults.borderColor;

  return {
    backgroundColor,
    cornerRadius: clamp(Number(appearance.cornerRadius) || 0, 0, APPEARANCE_LIMITS.cornerRadius.max),
    borderWidth: clamp(Number(appearance.borderWidth) || 0, 0, APPEARANCE_LIMITS.borderWidth.max),
    borderColor,
  };
}

export function hasActiveAppearance(appearance = {}) {
  const normalized = normalizeAppearance(appearance);
  return Boolean(normalized.backgroundColor || normalized.cornerRadius > 0 || normalized.borderWidth > 0);
}

export function getAppearanceSummary(appearance = {}) {
  const normalized = normalizeAppearance(appearance);
  const labels = [];

  if (normalized.backgroundColor) {
    labels.push("背景填充");
  }
  if (normalized.cornerRadius > 0) {
    labels.push("圆角");
  }
  if (normalized.borderWidth > 0) {
    labels.push("边框");
  }

  return labels.length > 0 ? labels.join(" · ") : "默认";
}

function createCanvasLike(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  return canvas;
}

function traceRoundedRect(context, x, y, width, height, radius) {
  const nextRadius = clamp(radius, 0, Math.min(width, height) / 2);

  context.beginPath();
  if (nextRadius === 0) {
    context.rect(x, y, width, height);
    return;
  }

  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.arcTo(x + width, y, x + width, y + nextRadius, nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.arcTo(x + width, y + height, x + width - nextRadius, y + height, nextRadius);
  context.lineTo(x + nextRadius, y + height);
  context.arcTo(x, y + height, x, y + height - nextRadius, nextRadius);
  context.lineTo(x, y + nextRadius);
  context.arcTo(x, y, x + nextRadius, y, nextRadius);
  context.closePath();
}

export function applyAppearanceToCanvas(sourceCanvas, appearance = {}) {
  const normalized = normalizeAppearance(appearance);
  if (!normalized.cornerRadius && !normalized.borderWidth) {
    return sourceCanvas;
  }

  const canvas = createCanvasLike(sourceCanvas);
  const context = canvas.getContext("2d");
  const radius = clamp(normalized.cornerRadius, 0, Math.min(canvas.width, canvas.height) / 2);
  const borderWidth = clamp(normalized.borderWidth, 0, Math.min(canvas.width, canvas.height) / 2);

  if (radius > 0) {
    context.save();
    traceRoundedRect(context, 0, 0, canvas.width, canvas.height, radius);
    context.clip();
    context.drawImage(sourceCanvas, 0, 0);
    context.restore();
  } else {
    context.drawImage(sourceCanvas, 0, 0);
  }

  if (borderWidth > 0) {
    const inset = borderWidth / 2;
    traceRoundedRect(
      context,
      inset,
      inset,
      canvas.width - borderWidth,
      canvas.height - borderWidth,
      Math.max(radius - inset, 0)
    );
    context.lineWidth = borderWidth;
    context.strokeStyle = normalized.borderColor;
    context.stroke();
  }

  return canvas;
}
