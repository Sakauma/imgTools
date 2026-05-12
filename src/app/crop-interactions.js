import { MIN_CROP_SIZE, clamp, getDisplayCropRect } from "../lib/geometry.js";
import { createSnapshot } from "../lib/history.js";
import {
  getLockedCropRatio,
  getOrientedSourceSize,
  invalidateOutputCache,
  syncSessionDerivedState,
} from "../lib/session.js";
import { getStagePoint } from "./stage-points.js";

export function isCropDrag(drag) {
  return drag?.type === "move" || drag?.type === "resize";
}

export function createCropInteraction({
  session,
  viewState,
  runtimeState,
  elements,
  renderCropOverlay,
  renderStats,
  queueResultPreview,
}) {
  function getMinimumCropRatios() {
    const oriented = getOrientedSourceSize(session);
    return {
      minWidthRatio: MIN_CROP_SIZE / oriented.width,
      minHeightRatio: MIN_CROP_SIZE / oriented.height,
    };
  }

  function setCropRect(nextRect, { previewMode = "immediate" } = {}) {
    session.pipeline.crop.rect = nextRect;
    syncSessionDerivedState(session);
    invalidateOutputCache(session);
    if (runtimeState.stageMetrics) {
      runtimeState.stageMetrics.cropDisplayRect = getDisplayCropRect(
        session.pipeline.crop.rect,
        runtimeState.stageMetrics.displayWidth,
        runtimeState.stageMetrics.displayHeight
      );
    }
    renderCropOverlay();
    renderStats();
    queueResultPreview(previewMode);
  }

  function beginCropDrag(event) {
    if (!session.source || viewState.activeTool !== "crop" || elements.cropBox.hidden) {
      return;
    }

    const handle = event.target.dataset.handle;
    const point = getStagePoint(elements, event.clientX, event.clientY);
    const displayRect = runtimeState.stageMetrics.cropDisplayRect;

    runtimeState.pendingHistorySnapshot = createSnapshot(session, viewState);
    if (handle) {
      runtimeState.drag = {
        type: "resize",
        handle,
        origin: structuredClone(session.pipeline.crop.rect),
      };
    } else {
      runtimeState.drag = {
        type: "move",
        offsetX: point.x - displayRect.x,
        offsetY: point.y - displayRect.y,
        origin: structuredClone(session.pipeline.crop.rect),
      };
    }

    elements.cropBox.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function resizeCropFreely(handle, point) {
    const origin = runtimeState.drag.origin;
    let left = origin.x;
    let top = origin.y;
    let right = origin.x + origin.width;
    let bottom = origin.y + origin.height;

    if (handle.includes("w")) {
      left = point.x;
    }
    if (handle.includes("e")) {
      right = point.x;
    }
    if (handle.includes("n")) {
      top = point.y;
    }
    if (handle.includes("s")) {
      bottom = point.y;
    }

    return {
      x: Math.min(left, right),
      y: Math.min(top, bottom),
      width: Math.abs(right - left),
      height: Math.abs(bottom - top),
    };
  }

  function resizeCropWithRatio(handle, point, ratio) {
    const origin = runtimeState.drag.origin;
    let anchorX = origin.x;
    let anchorY = origin.y;
    let horizontal = 1;
    let vertical = 1;

    switch (handle) {
      case "nw":
        anchorX = origin.x + origin.width;
        anchorY = origin.y + origin.height;
        horizontal = -1;
        vertical = -1;
        break;
      case "ne":
        anchorX = origin.x;
        anchorY = origin.y + origin.height;
        horizontal = 1;
        vertical = -1;
        break;
      case "sw":
        anchorX = origin.x + origin.width;
        anchorY = origin.y;
        horizontal = -1;
        vertical = 1;
        break;
      case "se":
        anchorX = origin.x;
        anchorY = origin.y;
        horizontal = 1;
        vertical = 1;
        break;
    }

    const { minWidthRatio, minHeightRatio } = getMinimumCropRatios();
    const minWidth = Math.max(minWidthRatio, minHeightRatio * ratio);
    const rawWidth = Math.abs(point.x - anchorX);
    const rawHeight = Math.abs(point.y - anchorY);
    const desiredWidth = Math.max(minWidth, Math.min(rawWidth, rawHeight * ratio));
    const maxWidthByBounds = horizontal < 0 ? anchorX : 1 - anchorX;
    const maxHeightByBounds = vertical < 0 ? anchorY : 1 - anchorY;
    const maxWidth = Math.min(maxWidthByBounds, maxHeightByBounds * ratio);
    const width = clamp(desiredWidth, minWidth, maxWidth);
    const height = width / ratio;

    return {
      x: horizontal < 0 ? anchorX - width : anchorX,
      y: vertical < 0 ? anchorY - height : anchorY,
      width,
      height,
    };
  }

  function moveOrResizeCrop(event) {
    const point = getStagePoint(elements, event.clientX, event.clientY);
    const normalizedPoint = {
      x: point.x / runtimeState.stageMetrics.displayWidth,
      y: point.y / runtimeState.stageMetrics.displayHeight,
    };

    if (runtimeState.drag.type === "move") {
      const displayRect = getDisplayCropRect(
        runtimeState.drag.origin,
        runtimeState.stageMetrics.displayWidth,
        runtimeState.stageMetrics.displayHeight
      );
      const width = displayRect.width / runtimeState.stageMetrics.displayWidth;
      const height = displayRect.height / runtimeState.stageMetrics.displayHeight;
      setCropRect(
        {
          x: (point.x - runtimeState.drag.offsetX) / runtimeState.stageMetrics.displayWidth,
          y: (point.y - runtimeState.drag.offsetY) / runtimeState.stageMetrics.displayHeight,
          width,
          height,
        },
        { previewMode: "throttled" }
      );
      return;
    }

    const lockedRatio = getLockedCropRatio(session);
    if (lockedRatio) {
      setCropRect(resizeCropWithRatio(runtimeState.drag.handle, normalizedPoint, lockedRatio), {
        previewMode: "throttled",
      });
      return;
    }

    setCropRect(resizeCropFreely(runtimeState.drag.handle, normalizedPoint), {
      previewMode: "throttled",
    });
  }

  return {
    beginCropDrag,
    moveOrResizeCrop,
  };
}
