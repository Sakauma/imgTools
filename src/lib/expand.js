import { toPositiveInteger } from "./geometry.js";

export const EXPAND_ASPECT_OPTIONS = [
  { value: "original", label: "原始比例" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "custom", label: "自定义" },
];

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

export function createDefaultExpand() {
  return {
    enabled: false,
    aspectMode: "original",
    customAspect: { width: 4, height: 5 },
  };
}

export function normalizeExpand(expand = {}) {
  const defaults = createDefaultExpand();
  const aspectMode = EXPAND_ASPECT_OPTIONS.some((option) => option.value === expand.aspectMode)
    ? expand.aspectMode
    : defaults.aspectMode;

  return {
    enabled: Boolean(expand.enabled),
    aspectMode,
    customAspect: {
      width: toPositiveInteger(expand.customAspect?.width, defaults.customAspect.width),
      height: toPositiveInteger(expand.customAspect?.height, defaults.customAspect.height),
    },
  };
}

export function getExpandRatio(baseSize, expand = {}) {
  const normalized = normalizeExpand(expand);
  if (!baseSize?.width || !baseSize?.height) {
    return 1;
  }

  if (normalized.aspectMode === "original") {
    return baseSize.width / baseSize.height;
  }

  if (normalized.aspectMode === "custom") {
    return normalized.customAspect.width / normalized.customAspect.height;
  }

  const [width, height] = normalized.aspectMode.split(":").map(Number);
  return width / height;
}

export function getExpandedSize(baseSize, expand = {}) {
  if (!baseSize?.width || !baseSize?.height) {
    return { width: 0, height: 0 };
  }

  const normalized = normalizeExpand(expand);
  if (!normalized.enabled) {
    return { width: baseSize.width, height: baseSize.height };
  }

  const currentRatio = baseSize.width / baseSize.height;
  const targetRatio = getExpandRatio(baseSize, normalized);

  if (!Number.isFinite(targetRatio) || targetRatio <= 0 || Math.abs(currentRatio - targetRatio) < 0.0001) {
    return { width: baseSize.width, height: baseSize.height };
  }

  if (targetRatio > currentRatio) {
    return {
      width: Math.max(baseSize.width, Math.round(baseSize.height * targetRatio)),
      height: baseSize.height,
    };
  }

  return {
    width: baseSize.width,
    height: Math.max(baseSize.height, Math.round(baseSize.width / targetRatio)),
  };
}

export function hasActiveExpand(baseSize, expand = {}) {
  const expandedSize = getExpandedSize(baseSize, expand);
  return Boolean(
    normalizeExpand(expand).enabled &&
      (expandedSize.width !== baseSize.width || expandedSize.height !== baseSize.height)
  );
}

export function getExpandModeLabel(baseSize, expand = {}) {
  const normalized = normalizeExpand(expand);
  if (normalized.aspectMode === "custom") {
    return `${normalized.customAspect.width}:${normalized.customAspect.height}`;
  }

  if (normalized.aspectMode === "original") {
    return `${baseSize.width}:${baseSize.height}`;
  }

  return normalized.aspectMode;
}

export function getExpandSummary(baseSize, expand = {}) {
  if (!baseSize?.width || !baseSize?.height || !hasActiveExpand(baseSize, expand)) {
    return "未扩边";
  }

  return `扩边 ${getExpandModeLabel(baseSize, expand)}`;
}

function createCanvasLike(sourceCanvas, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width ?? sourceCanvas.width;
  canvas.height = height ?? sourceCanvas.height;
  return canvas;
}

export function applyExpandToCanvas(sourceCanvas, expand = {}, backgroundColor = null) {
  const baseSize = { width: sourceCanvas.width, height: sourceCanvas.height };
  const expandedSize = getExpandedSize(baseSize, expand);
  const fillColor = isHexColor(backgroundColor)
    ? backgroundColor
    : normalizeExpand(expand).enabled
      ? "#ffffff"
      : null;

  if (
    expandedSize.width === sourceCanvas.width &&
    expandedSize.height === sourceCanvas.height &&
    !fillColor
  ) {
    return sourceCanvas;
  }

  const canvas = createCanvasLike(sourceCanvas, expandedSize.width, expandedSize.height);
  const context = canvas.getContext("2d");

  if (fillColor) {
    context.fillStyle = fillColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const offsetX = Math.round((canvas.width - sourceCanvas.width) / 2);
  const offsetY = Math.round((canvas.height - sourceCanvas.height) / 2);
  context.drawImage(sourceCanvas, offsetX, offsetY);

  return canvas;
}
