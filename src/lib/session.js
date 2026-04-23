import {
  DEFAULT_CROP_SCALE,
  MIN_CROP_SIZE,
  clampCropRect,
  createCenteredCropRect,
  getOrientedSize,
  getPixelCropRect,
} from "./geometry.js";
import { clampQuality, getBaseFileName } from "./export.js";
import { createHistoryState } from "./history.js";

export function createDefaultTransforms() {
  return {
    cropRect: createCenteredCropRect({ scale: DEFAULT_CROP_SCALE }),
    cropAspectMode: "free",
    customAspect: { width: 4, height: 5 },
    rotateQuarterTurns: 0,
    flipX: false,
    flipY: false,
    resize: {
      enabled: false,
      targetWidth: null,
      targetHeight: null,
      keepAspectRatio: true,
    },
  };
}

export function createDefaultExportOptions(fileName) {
  return {
    format: "image/png",
    quality: 0.92,
    fileName: getBaseFileName(fileName),
  };
}

export function createEditorSession() {
  return {
    source: null,
    activeTool: "crop",
    transforms: createDefaultTransforms(),
    exportOptions: createDefaultExportOptions("imgtools-output"),
    history: createHistoryState(),
    ui: {
      dropDepth: 0,
      drag: null,
      pendingHistorySnapshot: null,
      activeLoadToken: 0,
      stageMetrics: null,
      previewRenderId: 0,
      previewThrottleId: 0,
      lastPreviewAt: 0,
    },
    cache: {
      orientedKey: "",
      orientedCanvas: null,
    },
  };
}

export function invalidateDerivedCaches(session) {
  session.cache.orientedKey = "";
  session.cache.orientedCanvas = null;
}

export function getLockedCropRatio(session) {
  const { cropAspectMode, customAspect } = session.transforms;
  if (cropAspectMode === "free") {
    return null;
  }

  if (cropAspectMode === "custom") {
    const width = Number(customAspect.width);
    const height = Number(customAspect.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return width / height;
  }

  const [width, height] = cropAspectMode.split(":").map(Number);
  return width / height;
}

export function getOrientedSourceSize(session) {
  if (!session.source) {
    return { width: 0, height: 0 };
  }

  return getOrientedSize(
    session.source.width,
    session.source.height,
    session.transforms.rotateQuarterTurns
  );
}

export function getCropBaseSize(session) {
  if (!session.source) {
    return { width: 0, height: 0 };
  }

  const oriented = getOrientedSourceSize(session);
  const rect = getPixelCropRect(session.transforms.cropRect, oriented.width, oriented.height);
  return { width: rect.width, height: rect.height };
}

export function syncResizeTargets(session, { force = false } = {}) {
  if (!session.source) {
    return;
  }

  const baseSize = getCropBaseSize(session);
  const resize = session.transforms.resize;

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
  session.transforms.cropRect = clampCropRect(session.transforms.cropRect, {
    minWidthRatio,
    minHeightRatio,
    ratio: getLockedCropRatio(session),
  });
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
  session.activeTool = "crop";
  session.transforms = createDefaultTransforms();
  session.exportOptions = createDefaultExportOptions(name);
  session.history = createHistoryState();
  session.ui.dropDepth = 0;
  session.ui.drag = null;
  session.ui.pendingHistorySnapshot = null;
  session.ui.stageMetrics = null;
  session.ui.previewRenderId = 0;
  session.ui.previewThrottleId = 0;
  session.ui.lastPreviewAt = 0;
  invalidateDerivedCaches(session);
  syncSessionDerivedState(session, { forceResizeTargets: true });
}
