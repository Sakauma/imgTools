import {
  APPEARANCE_LIMITS,
  createDefaultAppearance,
} from "../lib/appearance.js";
import {
  ADJUSTMENT_LIMITS,
  createDefaultAdjustments,
} from "../lib/adjustments.js";
import { createDefaultExpand } from "../lib/expand.js";
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
import { resetViewStateForSource } from "../lib/ui-state.js";
import { createPosterActions } from "./poster-actions.js";

export function createActions({
  session,
  viewState,
  runtimeState,
  elements,
  renderAll,
  downloadCurrentResult,
}) {
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

    const before = createSnapshot(session, viewState);
    mutator();
    syncSessionDerivedState(session, { forceResizeTargets });
    const after = createSnapshot(session, viewState);
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
    setAdjustmentValue(key, value) {
      applyTrackedChange(() => {
        if (!(key in ADJUSTMENT_LIMITS)) {
          return;
        }

        session.pipeline.adjustments[key] = Number(value);
      });
    },
    setAdjustmentToggle(key, enabled) {
      applyTrackedChange(() => {
        session.pipeline.adjustments[key] = Boolean(enabled);
      });
    },
    resetAdjustments() {
      applyTrackedChange(() => {
        session.pipeline.adjustments = createDefaultAdjustments();
      });
    },
    setExpandEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.expand.enabled = Boolean(enabled);
      });
    },
    setExpandAspectMode(mode) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = mode;
      });
    },
    setExpandCustomAspectWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = "custom";
        session.pipeline.expand.customAspect.width = toPositiveInteger(
          value,
          session.pipeline.expand.customAspect.width
        );
      });
    },
    setExpandCustomAspectHeight(value) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = "custom";
        session.pipeline.expand.customAspect.height = toPositiveInteger(
          value,
          session.pipeline.expand.customAspect.height
        );
      });
    },
    resetExpand() {
      applyTrackedChange(() => {
        session.pipeline.expand = createDefaultExpand();
      });
    },
    setAppearanceBackgroundEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.appearance.backgroundColor = enabled
          ? session.pipeline.appearance.backgroundColor || "#f8fafc"
          : null;
      });
    },
    setAppearanceBackgroundColor(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.backgroundColor = value;
      });
    },
    setAppearanceCornerRadius(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.cornerRadius = Math.min(
          APPEARANCE_LIMITS.cornerRadius.max,
          Math.max(0, Number(value) || 0)
        );
      });
    },
    setAppearanceBorderEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderWidth = enabled
          ? Math.max(1, Number(session.pipeline.appearance.borderWidth) || 1)
          : 0;
      });
    },
    setAppearanceBorderWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderWidth = Math.min(
          APPEARANCE_LIMITS.borderWidth.max,
          Math.max(0, Number(value) || 0)
        );
      });
    },
    setAppearanceBorderColor(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderColor = value;
      });
    },
    resetAppearance() {
      applyTrackedChange(() => {
        session.pipeline.appearance = createDefaultAppearance();
      });
    },
    ...createPosterActions({ session, viewState, renderAll, applyTrackedChange }),
    download() {
      void downloadCurrentResult();
    },
  };

  function bindSessionButtons() {
    elements.resetSessionBtn.addEventListener("click", () => {
      if (!session.source) {
        return;
      }

      const before = createSnapshot(session, viewState);
      resetViewStateForSource(viewState);
      session.pipeline = createDefaultPipeline();
      session.exportOptions = createDefaultExportOptions(session.source.name);
      syncSessionDerivedState(session, { forceResizeTargets: true });
      runtimeState.drag = null;
      runtimeState.pendingHistorySnapshot = null;
      const after = createSnapshot(session, viewState);
      invalidateCachesForSnapshotChange(session, before, after);
      commitSnapshot(session, before, after);
      renderAll();
    });

    elements.undoBtn.addEventListener("click", () => {
      const before = createSnapshot(session, viewState);
      if (!undo(session, viewState)) {
        return;
      }

      syncSessionDerivedState(session);
      const after = createSnapshot(session, viewState);
      invalidateCachesForSnapshotChange(session, before, after);
      renderAll();
    });

    elements.redoBtn.addEventListener("click", () => {
      const before = createSnapshot(session, viewState);
      if (!redo(session, viewState)) {
        return;
      }

      syncSessionDerivedState(session);
      const after = createSnapshot(session, viewState);
      invalidateCachesForSnapshotChange(session, before, after);
      renderAll();
    });
  }

  return {
    actions,
    bindSessionButtons,
  };
}
