import { clamp, toPositiveInteger } from "./geometry.js";

export const EXPORT_FORMATS = [
  { mime: "image/png", label: "PNG", extension: "png", adjustableQuality: false },
  { mime: "image/jpeg", label: "JPEG", extension: "jpg", adjustableQuality: true },
  { mime: "image/webp", label: "WebP", extension: "webp", adjustableQuality: true },
];

export function getFormatConfig(mime) {
  return EXPORT_FORMATS.find((format) => format.mime === mime) ?? EXPORT_FORMATS[0];
}

export function isQualityAdjustable(mime) {
  return getFormatConfig(mime).adjustableQuality;
}

export function clampQuality(value) {
  return clamp(Number(value) || 0.92, 0.1, 1);
}

export function getBaseFileName(fileName = "imgtools-output") {
  const trimmed = String(fileName).trim();
  const withoutExtension = trimmed.replace(/\.[a-zA-Z0-9]+$/, "");
  const sanitized = withoutExtension.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").trim();
  return sanitized || "imgtools-output";
}

export function buildDownloadName(baseName, mime) {
  const format = getFormatConfig(mime);
  return `${getBaseFileName(baseName)}.${format.extension}`;
}

export function getOutputSize(baseSize, resize) {
  if (!resize?.enabled) {
    return { width: baseSize.width, height: baseSize.height };
  }

  return {
    width: toPositiveInteger(resize.targetWidth, baseSize.width),
    height: toPositiveInteger(resize.targetHeight, baseSize.height),
  };
}

export function scaleHeightFromWidth(baseSize, width) {
  return Math.max(1, Math.round((width * baseSize.height) / baseSize.width));
}

export function scaleWidthFromHeight(baseSize, height) {
  return Math.max(1, Math.round((height * baseSize.width) / baseSize.height));
}
