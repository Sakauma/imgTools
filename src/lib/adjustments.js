import { clamp } from "./geometry.js";

export const ADJUSTMENT_LIMITS = {
  brightness: { min: -100, max: 100, step: 1 },
  contrast: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  blur: { min: 0, max: 12, step: 0.5 },
  sharpen: { min: 0, max: 100, step: 1 },
};

const TOGGLE_ADJUSTMENTS = ["grayscale", "sepia", "invert"];

export function createDefaultAdjustments() {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    grayscale: false,
    sepia: false,
    invert: false,
    blur: 0,
    sharpen: 0,
  };
}

export function normalizeAdjustments(adjustments = {}) {
  const defaults = createDefaultAdjustments();
  const normalized = { ...defaults };

  Object.entries(ADJUSTMENT_LIMITS).forEach(([key, limits]) => {
    normalized[key] = clamp(Number(adjustments[key]) || 0, limits.min, limits.max);
  });

  TOGGLE_ADJUSTMENTS.forEach((key) => {
    normalized[key] = Boolean(adjustments[key]);
  });

  return normalized;
}

export function hasActiveAdjustments(adjustments = {}) {
  const normalized = normalizeAdjustments(adjustments);
  return (
    normalized.brightness !== 0 ||
    normalized.contrast !== 0 ||
    normalized.saturation !== 0 ||
    normalized.temperature !== 0 ||
    normalized.tint !== 0 ||
    normalized.grayscale ||
    normalized.sepia ||
    normalized.invert ||
    normalized.blur > 0 ||
    normalized.sharpen > 0
  );
}

export function getActiveAdjustmentLabels(adjustments = {}) {
  const normalized = normalizeAdjustments(adjustments);
  const labels = [];

  if (normalized.brightness !== 0) {
    labels.push("亮度");
  }
  if (normalized.contrast !== 0) {
    labels.push("对比度");
  }
  if (normalized.saturation !== 0) {
    labels.push("饱和度");
  }
  if (normalized.temperature !== 0) {
    labels.push("色温");
  }
  if (normalized.tint !== 0) {
    labels.push("色调");
  }
  if (normalized.grayscale) {
    labels.push("灰度");
  }
  if (normalized.sepia) {
    labels.push("棕褐色");
  }
  if (normalized.invert) {
    labels.push("反相");
  }
  if (normalized.blur > 0) {
    labels.push("模糊");
  }
  if (normalized.sharpen > 0) {
    labels.push("锐化");
  }

  return labels;
}

export function getAdjustmentSummary(adjustments = {}) {
  const labels = getActiveAdjustmentLabels(adjustments);
  if (!labels.length) {
    return "未调整";
  }

  if (labels.length <= 3) {
    return labels.join(" · ");
  }

  return `${labels.slice(0, 3).join(" · ")} · 等 ${labels.length} 项`;
}

function clampChannel(value) {
  return clamp(Math.round(value), 0, 255);
}

function applySepiaMatrix(red, green, blue) {
  return {
    red: clampChannel(red * 0.393 + green * 0.769 + blue * 0.189),
    green: clampChannel(red * 0.349 + green * 0.686 + blue * 0.168),
    blue: clampChannel(red * 0.272 + green * 0.534 + blue * 0.131),
  };
}

export function applyColorAdjustmentsToPixels(sourcePixels, adjustments = {}) {
  const normalized = normalizeAdjustments(adjustments);
  const output = new Uint8ClampedArray(sourcePixels);

  const brightnessOffset = normalized.brightness * 1.6;
  const contrastValue = normalized.contrast * 2.55;
  const contrastFactor =
    normalized.contrast === 0
      ? 1
      : (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
  const saturationFactor = 1 + normalized.saturation / 100;
  const temperatureShift = normalized.temperature * 0.9;
  const tintShift = normalized.tint * 0.75;

  for (let index = 0; index < output.length; index += 4) {
    let red = output[index];
    let green = output[index + 1];
    let blue = output[index + 2];

    if (normalized.brightness !== 0) {
      red += brightnessOffset;
      green += brightnessOffset;
      blue += brightnessOffset;
    }

    if (normalized.contrast !== 0) {
      red = contrastFactor * (red - 128) + 128;
      green = contrastFactor * (green - 128) + 128;
      blue = contrastFactor * (blue - 128) + 128;
    }

    if (normalized.saturation !== 0) {
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      red = luminance + (red - luminance) * saturationFactor;
      green = luminance + (green - luminance) * saturationFactor;
      blue = luminance + (blue - luminance) * saturationFactor;
    }

    if (normalized.temperature !== 0) {
      red += temperatureShift;
      blue -= temperatureShift;
    }

    if (normalized.tint !== 0) {
      red += tintShift * 0.3;
      green -= tintShift * 0.6;
      blue += tintShift * 0.3;
    }

    if (normalized.grayscale) {
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      red = luminance;
      green = luminance;
      blue = luminance;
    }

    if (normalized.sepia) {
      const sepia = applySepiaMatrix(red, green, blue);
      red = sepia.red;
      green = sepia.green;
      blue = sepia.blue;
    }

    if (normalized.invert) {
      red = 255 - red;
      green = 255 - green;
      blue = 255 - blue;
    }

    output[index] = clampChannel(red);
    output[index + 1] = clampChannel(green);
    output[index + 2] = clampChannel(blue);
  }

  return output;
}

export function applySharpenToPixels(sourcePixels, width, height, amount = 0) {
  const normalizedAmount = clamp(Number(amount) || 0, 0, 100) / 100;
  if (normalizedAmount === 0 || width < 3 || height < 3) {
    return new Uint8ClampedArray(sourcePixels);
  }

  const output = new Uint8ClampedArray(sourcePixels);
  const sharpened = new Uint8ClampedArray(sourcePixels);
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        let total = 0;

        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const sampleIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
            total += sourcePixels[sampleIndex] * kernel[ky + 1][kx + 1];
          }
        }

        sharpened[pixelIndex + channel] = clampChannel(total);
      }
    }
  }

  for (let index = 0; index < output.length; index += 4) {
    output[index] = clampChannel(
      sourcePixels[index] * (1 - normalizedAmount) + sharpened[index] * normalizedAmount
    );
    output[index + 1] = clampChannel(
      sourcePixels[index + 1] * (1 - normalizedAmount) + sharpened[index + 1] * normalizedAmount
    );
    output[index + 2] = clampChannel(
      sourcePixels[index + 2] * (1 - normalizedAmount) + sharpened[index + 2] * normalizedAmount
    );
    output[index + 3] = sourcePixels[index + 3];
  }

  return output;
}

function createCanvasLike(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  return canvas;
}

function applyBlurToCanvas(sourceCanvas, radius) {
  if (radius <= 0) {
    return sourceCanvas;
  }

  const canvas = createCanvasLike(sourceCanvas);
  const context = canvas.getContext("2d");
  context.filter = `blur(${radius}px)`;
  context.drawImage(sourceCanvas, 0, 0);
  context.filter = "none";
  return canvas;
}

export function applyAdjustmentsToCanvas(sourceCanvas, adjustments = {}) {
  const normalized = normalizeAdjustments(adjustments);
  if (!hasActiveAdjustments(normalized)) {
    return sourceCanvas;
  }

  const canvas = createCanvasLike(sourceCanvas);
  const context = canvas.getContext("2d");
  context.drawImage(sourceCanvas, 0, 0);

  const hasColorAdjustments =
    normalized.brightness !== 0 ||
    normalized.contrast !== 0 ||
    normalized.saturation !== 0 ||
    normalized.temperature !== 0 ||
    normalized.tint !== 0 ||
    normalized.grayscale ||
    normalized.sepia ||
    normalized.invert;

  if (hasColorAdjustments) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const nextPixels = applyColorAdjustmentsToPixels(imageData.data, normalized);
    imageData.data.set(nextPixels);
    context.putImageData(imageData, 0, 0);
  }

  const blurredCanvas = normalized.blur > 0 ? applyBlurToCanvas(canvas, normalized.blur) : canvas;

  if (normalized.sharpen === 0) {
    return blurredCanvas;
  }

  const sharpenContext = blurredCanvas.getContext("2d");
  const imageData = sharpenContext.getImageData(0, 0, blurredCanvas.width, blurredCanvas.height);
  const nextPixels = applySharpenToPixels(
    imageData.data,
    blurredCanvas.width,
    blurredCanvas.height,
    normalized.sharpen
  );
  imageData.data.set(nextPixels);
  sharpenContext.putImageData(imageData, 0, 0);
  return blurredCanvas;
}
