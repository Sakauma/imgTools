import {
  MIN_CROP_SIZE,
  constrainCropToAspect,
  createCenteredCropRect,
  flipCropRect,
  rotateCropRect,
  toPositiveInteger,
} from "../lib/geometry.js";
import {
  clampQuality,
  isQualityAdjustable,
  scaleHeightFromWidth,
  scaleWidthFromHeight,
} from "../lib/export.js";
import { commitSnapshot, createSnapshot, redo, undo } from "../lib/history.js";
import {
  createDefaultExportOptions,
  createDefaultPipeline,
  getCropBaseSize,
  getLockedCropRatio,
  getOrientedSourceSize,
  invalidateCachesForSnapshotChange,
  syncResizeTargets,
  syncSessionDerivedState,
} from "../lib/session.js";

export function createActions({ session, elements, renderAll, downloadCurrentResult }) {
  function getMinimumCropRatios() {
    const oriented = getOrientedSourceSize(session);
    return {
      minWidthRatio: MIN_CROP_SIZE / oriented.width,
      minHeightRatio: MIN_CROP_SIZE / oriented.height,
    };
  }

  function applyTrackedChange(mutator, { forceResizeTargets = false, previewMode = "immediate" } = {}) {
    if (!session.source) {
      return;
    }

    const before = createSnapshot(session);
    mutator();
    syncSessionDerivedState(session, { forceResizeTargets });
    const after = createSnapshot(session);
    invalidateCachesForSnapshotChange(session, before, after);
    commitSnapshot(session, before, after);
    renderAll({ previewMode });
  }

  const actions = {
    setCropAspectMode(mode) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = mode;
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = "custom";
        session.pipeline.crop.customAspect.width = toPositiveInteger(
          value,
          session.pipeline.crop.customAspect.width
        );
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectHeight(value) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = "custom";
        session.pipeline.crop.customAspect.height = toPositiveInteger(
          value,
          session.pipeline.crop.customAspect.height
        );
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    centerCrop() {
      applyTrackedChange(() => {
        const rect = session.pipeline.crop.rect;
        session.pipeline.crop.rect = {
          ...rect,
          x: (1 - rect.width) / 2,
          y: (1 - rect.height) / 2,
        };
      });
    },
    resetCrop() {
      applyTrackedChange(
        () => {
          session.pipeline.crop.rect = createCenteredCropRect({
            ratio: getLockedCropRatio(session),
          });
        },
        { forceResizeTargets: !session.pipeline.resize.enabled }
      );
    },
    setResizeEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.resize.enabled = enabled;
        if (enabled) {
          syncResizeTargets(session, { force: true });
        }
      });
    },
    setResizeWidth(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const width = toPositiveInteger(value, baseSize.width);
        session.pipeline.resize.targetWidth = width;
        if (session.pipeline.resize.keepAspectRatio) {
          session.pipeline.resize.targetHeight = scaleHeightFromWidth(baseSize, width);
        }
      });
    },
    setResizeHeight(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const height = toPositiveInteger(value, baseSize.height);
        session.pipeline.resize.targetHeight = height;
        if (session.pipeline.resize.keepAspectRatio) {
          session.pipeline.resize.targetWidth = scaleWidthFromHeight(baseSize, height);
        }
      });
    },
    setKeepAspectRatio(keepAspectRatio) {
      applyTrackedChange(() => {
        session.pipeline.resize.keepAspectRatio = keepAspectRatio;
        if (keepAspectRatio) {
          const baseSize = getCropBaseSize(session);
          session.pipeline.resize.targetHeight = scaleHeightFromWidth(
            baseSize,
            session.pipeline.resize.targetWidth
          );
        }
      });
    },
    useCropSize() {
      applyTrackedChange(() => {
        syncResizeTargets(session, { force: true });
      });
    },
    rotateLeft() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 3) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 3);
      });
    },
    rotateRight() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 1) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 1);
      });
    },
    rotate180() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 2) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 2);
      });
    },
    resetOrientation() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns = 0;
        session.pipeline.orientation.flipX = false;
        session.pipeline.orientation.flipY = false;
        session.pipeline.crop.rect = createCenteredCropRect({
          ratio: getLockedCropRatio(session),
        });
      });
    },
    flipHorizontal() {
      applyTrackedChange(() => {
        session.pipeline.orientation.flipX = !session.pipeline.orientation.flipX;
        session.pipeline.crop.rect = flipCropRect(session.pipeline.crop.rect, {
          horizontal: true,
        });
      });
    },
    flipVertical() {
      applyTrackedChange(() => {
        session.pipeline.orientation.flipY = !session.pipeline.orientation.flipY;
        session.pipeline.crop.rect = flipCropRect(session.pipeline.crop.rect, {
          vertical: true,
        });
      });
    },
    setExportFormat(format) {
      applyTrackedChange(() => {
        session.exportOptions.format = format;
        if (!isQualityAdjustable(format)) {
          session.exportOptions.quality = 0.92;
        }
      });
    },
    setExportQuality(value) {
      applyTrackedChange(() => {
        session.exportOptions.quality = clampQuality(value);
      });
    },
    setFileName(value) {
      applyTrackedChange(() => {
        session.exportOptions.fileName = value.trim() || session.source?.name || "imgtools-output";
      });
    },
    download() {
      void downloadCurrentResult();
    },
  };

  function bindSessionButtons() {
    elements.resetSessionBtn.addEventListener("click", () => {
      if (!session.source) {
        return;
      }

      const before = createSnapshot(session);
      session.pipeline = createDefaultPipeline();
      session.exportOptions = createDefaultExportOptions(session.source.name);
      syncSessionDerivedState(session, { forceResizeTargets: true });
      const after = createSnapshot(session);
      invalidateCachesForSnapshotChange(session, before, after);
      commitSnapshot(session, before, after);
      renderAll();
    });

    elements.undoBtn.addEventListener("click", () => {
      const before = createSnapshot(session);
      if (!undo(session)) {
        return;
      }

      syncSessionDerivedState(session);
      const after = createSnapshot(session);
      invalidateCachesForSnapshotChange(session, before, after);
      renderAll();
    });

    elements.redoBtn.addEventListener("click", () => {
      const before = createSnapshot(session);
      if (!redo(session)) {
        return;
      }

      syncSessionDerivedState(session);
      const after = createSnapshot(session);
      invalidateCachesForSnapshotChange(session, before, after);
      renderAll();
    });
  }

  return {
    actions,
    bindSessionButtons,
  };
}
