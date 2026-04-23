export const MIN_CROP_SIZE = 48;
export const DEFAULT_CROP_SCALE = 0.78;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundUnit(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundRect(rect) {
  return {
    x: roundUnit(rect.x),
    y: roundUnit(rect.y),
    width: roundUnit(rect.width),
    height: roundUnit(rect.height),
  };
}

export function roundQuarterTurns(value) {
  return ((Math.round(value) % 4) + 4) % 4;
}

export function getOrientedSize(width, height, quarterTurns) {
  const normalized = roundQuarterTurns(quarterTurns);
  return normalized % 2 === 0 ? { width, height } : { width: height, height: width };
}

export function fitInsideBox(contentWidth, contentHeight, maxWidth, maxHeight) {
  const safeMaxWidth = Math.max(1, maxWidth);
  const safeMaxHeight = Math.max(1, maxHeight);
  const scale = Math.min(safeMaxWidth / contentWidth, safeMaxHeight / contentHeight, 1);

  return {
    width: Math.max(1, Math.round(contentWidth * scale)),
    height: Math.max(1, Math.round(contentHeight * scale)),
  };
}

export function createCenteredCropRect({ scale = DEFAULT_CROP_SCALE, ratio = null } = {}) {
  let width = clamp(scale, 0.1, 1);
  let height = clamp(scale, 0.1, 1);

  if (ratio) {
    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }
  }

  return roundRect({
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  });
}

export function clampCropRect(
  rect,
  { minWidthRatio = 0.02, minHeightRatio = 0.02, ratio = null } = {}
) {
  let width = clamp(rect.width, minWidthRatio, 1);
  let height = clamp(rect.height, minHeightRatio, 1);

  if (ratio) {
    width = Math.min(width, height * ratio);
    height = width / ratio;

    if (height > 1) {
      height = 1;
      width = height * ratio;
    }

    if (width > 1) {
      width = 1;
      height = width / ratio;
    }

    const minWidth = Math.max(minWidthRatio, minHeightRatio * ratio);
    width = Math.max(width, minWidth);
    height = Math.max(height, width / ratio);
  }

  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);

  return roundRect({ x, y, width, height });
}

export function constrainCropToAspect(
  rect,
  ratio,
  { minWidthRatio = 0.02, minHeightRatio = 0.02 } = {}
) {
  if (!ratio) {
    return clampCropRect(rect, { minWidthRatio, minHeightRatio });
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const maxWidth = Math.min(centerX, 1 - centerX) * 2;
  const maxHeight = Math.min(centerY, 1 - centerY) * 2;
  let width = Math.min(rect.width, maxWidth);
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return clampCropRect(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    { minWidthRatio, minHeightRatio, ratio }
  );
}

export function rotateCropRect(rect, quarterTurns) {
  const normalized = roundQuarterTurns(quarterTurns);
  if (normalized === 0) {
    return roundRect({ ...rect });
  }

  if (normalized === 1) {
    return roundRect({
      x: 1 - (rect.y + rect.height),
      y: rect.x,
      width: rect.height,
      height: rect.width,
    });
  }

  if (normalized === 2) {
    return roundRect({
      x: 1 - (rect.x + rect.width),
      y: 1 - (rect.y + rect.height),
      width: rect.width,
      height: rect.height,
    });
  }

  return roundRect({
    x: rect.y,
    y: 1 - (rect.x + rect.width),
    width: rect.height,
    height: rect.width,
  });
}

export function flipCropRect(rect, { horizontal = false, vertical = false } = {}) {
  return roundRect({
    x: horizontal ? 1 - (rect.x + rect.width) : rect.x,
    y: vertical ? 1 - (rect.y + rect.height) : rect.y,
    width: rect.width,
    height: rect.height,
  });
}

export function getDisplayCropRect(rect, displayWidth, displayHeight) {
  return {
    x: rect.x * displayWidth,
    y: rect.y * displayHeight,
    width: rect.width * displayWidth,
    height: rect.height * displayHeight,
  };
}

export function getPixelCropRect(rect, width, height) {
  const left = rect.x * width;
  const top = rect.y * height;
  const right = (rect.x + rect.width) * width;
  const bottom = (rect.y + rect.height) * height;
  const x = clamp(Math.floor(left), 0, width - 1);
  const y = clamp(Math.floor(top), 0, height - 1);
  const clampedRight = clamp(Math.ceil(right), x + 1, width);
  const clampedBottom = clamp(Math.ceil(bottom), y + 1, height);

  return {
    x,
    y,
    width: clampedRight - x,
    height: clampedBottom - y,
  };
}

export function toPositiveInteger(value, fallback = 1) {
  const next = Math.round(Number(value));
  return Number.isFinite(next) && next > 0 ? next : fallback;
}
