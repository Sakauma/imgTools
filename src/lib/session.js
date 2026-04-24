import { createDefaultAppearance, normalizeAppearance } from "./appearance.js";
import { createDefaultExpand, getExpandedSize, normalizeExpand } from "./expand.js";
import {
  DEFAULT_CROP_SCALE,
  MIN_CROP_SIZE,
  clampCropRect,
  createCenteredCropRect,
  getOrientedSize,
  getPixelCropRect,
} from "./geometry.js";
import { createDefaultAdjustments, normalizeAdjustments } from "./adjustments.js";
import { clampQuality, getBaseFileName, getOutputSize } from "./export.js";
import { createHistoryState } from "./history.js";

function serializeState(value) {
  return JSON.stringify(value);
}

export function createDefaultPipeline() {
  return {
    orientation: {
      rotateQuarterTurns: 0,
      flipX: false,
      flipY: false,
    },
    crop: {
      rect: createCenteredCropRect({ scale: DEFAULT_CROP_SCALE }),
      aspectMode: "free",
      customAspect: { width: 4, height: 5 },
    },
    resize: {
      enabled: false,
      targetWidth: null,
      targetHeight: null,
      keepAspectRatio: true,
    },
    adjustments: createDefaultAdjustments(),
    expand: createDefaultExpand(),
    appearance: createDefaultAppearance(),
  };
}

export function createDefaultExportOptions(fileName) {
  return {
    format: "image/png",
    quality: 0.92,
    fileName: getBaseFileName(fileName),
  };
}

export function getOrientationState(pipeline) {
  return {
    rotateQuarterTurns: pipeline.orientation.rotateQuarterTurns,
    flipX: pipeline.orientation.flipX,
    flipY: pipeline.orientation.flipY,
  };
}

export function getPixelPipelineState(pipeline) {
  return {
    orientation: getOrientationState(pipeline),
    crop: {
      rect: pipeline.crop.rect,
    },
    resize: pipeline.resize.enabled
      ? {
          enabled: true,
          targetWidth: pipeline.resize.targetWidth,
          targetHeight: pipeline.resize.targetHeight,
        }
        : {
          enabled: false,
        },
    adjustments: normalizeAdjustments(pipeline.adjustments),
    expand: normalizeExpand(pipeline.expand),
    appearance: normalizeAppearance(pipeline.appearance),
  };
}

export function hasOrientationStateChanged(leftSnapshot, rightSnapshot) {
  return (
    serializeState(getOrientationState(leftSnapshot.pipeline)) !==
    serializeState(getOrientationState(rightSnapshot.pipeline))
  );
}

export function hasPixelPipelineChanged(leftSnapshot, rightSnapshot) {
  return (
    serializeState(getPixelPipelineState(leftSnapshot.pipeline)) !==
    serializeState(getPixelPipelineState(rightSnapshot.pipeline))
  );
}

export function createEditorSession() {
  return {
    source: null,
    pipeline: createDefaultPipeline(),
    exportOptions: createDefaultExportOptions("imgtools-output"),
    history: createHistoryState(),
    cache: {
      orientedKey: "",
      orientedCanvas: null,
      outputKey: "",
      outputCanvas: null,
      outputMeta: null,
    },
  };
}

export function invalidateOrientationCache(session) {
  session.cache.orientedKey = "";
  session.cache.orientedCanvas = null;
}

export function invalidateOutputCache(session) {
  session.cache.outputKey = "";
  session.cache.outputCanvas = null;
  session.cache.outputMeta = null;
}

export function invalidatePixelCaches(session, { orientation = false } = {}) {
  if (orientation) {
    invalidateOrientationCache(session);
  }

  invalidateOutputCache(session);
}

export function invalidateDerivedCaches(session) {
  invalidatePixelCaches(session, { orientation: true });
}

export function invalidateCachesForSnapshotChange(session, beforeSnapshot, afterSnapshot) {
  if (!beforeSnapshot || !afterSnapshot) {
    invalidateDerivedCaches(session);
    return;
  }

  if (hasOrientationStateChanged(beforeSnapshot, afterSnapshot)) {
    invalidatePixelCaches(session, { orientation: true });
    return;
  }

  if (hasPixelPipelineChanged(beforeSnapshot, afterSnapshot)) {
    invalidateOutputCache(session);
  }
}

export function getOrientationCacheKey(session) {
  if (!session.source) {
    return "";
  }

  return [session.source.token, serializeState(getOrientationState(session.pipeline))].join(":");
}

export function getOutputCacheKey(session) {
  if (!session.source) {
    return "";
  }

  return [session.source.token, serializeState(getPixelPipelineState(session.pipeline))].join(":");
}

export function getLockedCropRatio(session) {
  const { aspectMode, customAspect } = session.pipeline.crop;
  if (aspectMode === "free") {
    return null;
  }

  if (aspectMode === "custom") {
    const width = Number(customAspect.width);
    const height = Number(customAspect.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return width / height;
  }

  const [width, height] = aspectMode.split(":").map(Number);
  return width / height;
}

export function getOrientedSourceSize(session) {
  if (!session.source) {
    return { width: 0, height: 0 };
  }

  return getOrientedSize(
    session.source.width,
    session.source.height,
    session.pipeline.orientation.rotateQuarterTurns
  );
}

export function getCropBaseSize(session) {
  if (!session.source) {
    return { width: 0, height: 0 };
  }

  const oriented = getOrientedSourceSize(session);
  const rect = getPixelCropRect(session.pipeline.crop.rect, oriented.width, oriented.height);
  return { width: rect.width, height: rect.height };
}

export function getContentOutputSize(session) {
  const cropSize = getCropBaseSize(session);
  return getOutputSize(cropSize, session.pipeline.resize);
}

export function getFinalOutputSize(session) {
  const contentSize = getContentOutputSize(session);
  return getExpandedSize(contentSize, session.pipeline.expand);
}

export function syncResizeTargets(session, { force = false } = {}) {
  if (!session.source) {
    return;
  }

  const baseSize = getCropBaseSize(session);
  const resize = session.pipeline.resize;

  if (!resize.enabled || force || !resize.targetWidth || !resize.targetHeight) {
    resize.targetWidth = baseSize.width;
    resize.targetHeight = baseSize.height;
    return;
  }

  resize.targetWidth = Math.max(1, Math.round(resize.targetWidth));
  resize.targetHeight = Math.max(1, Math.round(resize.targetHeight));
}

export function syncSessionDerivedState(session, { forceResizeTargets = false } = {}) {
  if (!session.source) {
    return;
  }

  const oriented = getOrientedSourceSize(session);
  const minWidthRatio = MIN_CROP_SIZE / oriented.width;
  const minHeightRatio = MIN_CROP_SIZE / oriented.height;
  session.pipeline.crop.rect = clampCropRect(session.pipeline.crop.rect, {
    minWidthRatio,
    minHeightRatio,
    ratio: getLockedCropRatio(session),
  });
  session.pipeline.adjustments = normalizeAdjustments(session.pipeline.adjustments);
  session.pipeline.expand = normalizeExpand(session.pipeline.expand);
  session.pipeline.appearance = normalizeAppearance(session.pipeline.appearance);
  session.exportOptions.quality = clampQuality(session.exportOptions.quality);
  syncResizeTargets(session, { force: forceResizeTargets });
}

export function resetSessionForSource(session, { image, name, width, height }) {
  session.source = {
    image,
    name,
    width,
    height,
    token: `${Date.now()}-${Math.random()}`,
  };
  session.pipeline = createDefaultPipeline();
  session.exportOptions = createDefaultExportOptions(name);
  session.history = createHistoryState();
  invalidateDerivedCaches(session);
  syncSessionDerivedState(session, { forceResizeTargets: true });
}
