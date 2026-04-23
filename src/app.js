import {
  MIN_CROP_SIZE,
  clamp,
  constrainCropToAspect,
  createCenteredCropRect,
  flipCropRect,
  getDisplayCropRect,
  rotateCropRect,
  toPositiveInteger,
} from "./lib/geometry.js";
import {
  EXPORT_FORMATS,
  buildDownloadName,
  clampQuality,
  getFormatConfig,
  getOutputSize,
  isQualityAdjustable,
  scaleHeightFromWidth,
  scaleWidthFromHeight,
} from "./lib/export.js";
import { commitSnapshot, createSnapshot, redo, undo } from "./lib/history.js";
import {
  createDefaultExportOptions,
  createDefaultTransforms,
  createEditorSession,
  getCropBaseSize,
  getLockedCropRatio,
  getOrientedSourceSize,
  invalidateDerivedCaches,
  resetSessionForSource,
  syncResizeTargets,
  syncSessionDerivedState,
} from "./lib/session.js";
import { buildOutputCanvas, renderResultPreview, renderStageCanvas } from "./lib/pipeline.js";
import { toolMap, tools } from "./tools/index.js";

const RESULT_PREVIEW_MAX_SIZE = 420;
const DRAG_PREVIEW_INTERVAL = 90;

export function createApp(doc = document) {
  const elements = {
    imageInput: doc.querySelector("#imageInput"),
    loadDemoBtn: doc.querySelector("#loadDemoBtn"),
    resetSessionBtn: doc.querySelector("#resetSessionBtn"),
    undoBtn: doc.querySelector("#undoBtn"),
    redoBtn: doc.querySelector("#redoBtn"),
    toolTabs: doc.querySelector("#toolTabs"),
    toolPanel: doc.querySelector("#toolPanel"),
    viewport: doc.querySelector("#viewport"),
    emptyState: doc.querySelector("#emptyState"),
    stageShell: doc.querySelector("#stageShell"),
    stageCanvas: doc.querySelector("#stageCanvas"),
    cropBox: doc.querySelector("#cropBox"),
    activeToolLabel: doc.querySelector("#activeToolLabel"),
    toolHint: doc.querySelector("#toolHint"),
    resultCanvas: doc.querySelector("#resultCanvas"),
    resultEmptyState: doc.querySelector("#resultEmptyState"),
    exportMeta: doc.querySelector("#exportMeta"),
    sourceMeta: doc.querySelector("#sourceMeta"),
    cropMeta: doc.querySelector("#cropMeta"),
    outputMeta: doc.querySelector("#outputMeta"),
    transformMeta: doc.querySelector("#transformMeta"),
  };

  const session = createEditorSession();

  function getDerivedData() {
    if (!session.source) {
      return {
        cropSize: { width: 0, height: 0 },
        outputSize: { width: 0, height: 0 },
        format: getFormatConfig(session.exportOptions.format),
      };
    }

    const cropSize = getCropBaseSize(session);
    const outputSize = getOutputSize(cropSize, session.transforms.resize);
    return {
      cropSize,
      outputSize,
      format: getFormatConfig(session.exportOptions.format),
    };
  }

  function createLoadToken() {
    session.ui.activeLoadToken += 1;
    return session.ui.activeLoadToken;
  }

  function cancelPreviewThrottle() {
    if (!session.ui.previewThrottleId) {
      return;
    }

    window.clearTimeout(session.ui.previewThrottleId);
    session.ui.previewThrottleId = 0;
  }

  function queuePreviewFrame() {
    if (session.ui.previewRenderId) {
      return;
    }

    session.ui.previewRenderId = window.requestAnimationFrame(() => {
      session.ui.previewRenderId = 0;
      renderResultNow();
      session.ui.lastPreviewAt = performance.now();
    });
  }

  function queueResultPreview(mode = "immediate") {
    if (!session.source) {
      return;
    }

    if (mode === "immediate") {
      cancelPreviewThrottle();
      queuePreviewFrame();
      return;
    }

    const elapsed = performance.now() - session.ui.lastPreviewAt;
    if (elapsed >= DRAG_PREVIEW_INTERVAL) {
      queuePreviewFrame();
      return;
    }

    if (session.ui.previewThrottleId) {
      return;
    }

    session.ui.previewThrottleId = window.setTimeout(() => {
      session.ui.previewThrottleId = 0;
      queuePreviewFrame();
    }, Math.max(DRAG_PREVIEW_INTERVAL - elapsed, 16));
  }

  function renderToolTabs() {
    elements.toolTabs.innerHTML = tools
      .map(
        (tool) => `
          <button class="tool-tab${session.activeTool === tool.id ? " is-active" : ""}" type="button" data-tool-id="${tool.id}" aria-pressed="${session.activeTool === tool.id}">
            ${tool.label}
          </button>
        `
      )
      .join("");

    elements.toolTabs.querySelectorAll("[data-tool-id]").forEach((button) => {
      button.addEventListener("click", () => {
        session.activeTool = button.dataset.toolId;
        renderChrome();
      });
    });
  }

  function renderToolPanel() {
    const tool = toolMap.get(session.activeTool) ?? tools[0];
    tool.render(elements.toolPanel, session, actions, getDerivedData());
  }

  function renderWorkspaceHeader() {
    const tool = toolMap.get(session.activeTool) ?? tools[0];
    elements.activeToolLabel.textContent = tool.label;
    elements.toolHint.textContent = tool.hint;
  }

  function renderHistoryButtons() {
    elements.undoBtn.disabled = session.history.undoStack.length === 0;
    elements.redoBtn.disabled = session.history.redoStack.length === 0;
  }

  function getTransformSummary() {
    if (!session.source) {
      return "无";
    }

    const bits = [];
    const rotation = session.transforms.rotateQuarterTurns * 90;
    if (rotation) {
      bits.push(`旋转 ${rotation}°`);
    }
    if (session.transforms.flipX) {
      bits.push("水平翻转");
    }
    if (session.transforms.flipY) {
      bits.push("垂直翻转");
    }
    if (session.transforms.resize.enabled) {
      bits.push("已调整尺寸");
    }
    return bits.length > 0 ? bits.join(" · ") : "仅裁剪";
  }

  function renderStats() {
    if (!session.source) {
      elements.sourceMeta.textContent = "未加载";
      elements.cropMeta.textContent = "未选择";
      elements.outputMeta.textContent = "未输出";
      elements.transformMeta.textContent = "无";
      return;
    }

    const derived = getDerivedData();
    elements.sourceMeta.textContent = `${session.source.width} × ${session.source.height}px`;
    elements.cropMeta.textContent = `${derived.cropSize.width} × ${derived.cropSize.height}px`;
    elements.outputMeta.textContent = `${derived.outputSize.width} × ${derived.outputSize.height}px`;
    elements.transformMeta.textContent = getTransformSummary();
  }

  function renderCropOverlay() {
    const showCrop = Boolean(session.source && session.activeTool === "crop" && session.ui.stageMetrics);
    elements.cropBox.hidden = !showCrop;

    if (!showCrop) {
      return;
    }

    const displayRect = getDisplayCropRect(
      session.transforms.cropRect,
      session.ui.stageMetrics.displayWidth,
      session.ui.stageMetrics.displayHeight
    );

    elements.cropBox.style.transform = `translate3d(${displayRect.x}px, ${displayRect.y}px, 0)`;
    elements.cropBox.style.width = `${displayRect.width}px`;
    elements.cropBox.style.height = `${displayRect.height}px`;
  }

  function renderStage() {
    if (!session.source) {
      elements.emptyState.hidden = false;
      elements.stageShell.hidden = true;
      elements.cropBox.hidden = true;
      session.ui.stageMetrics = null;
      return;
    }

    const viewportBounds = elements.viewport.getBoundingClientRect();
    const metrics = renderStageCanvas(
      session,
      elements.stageCanvas,
      viewportBounds.width,
      viewportBounds.height
    );

    session.ui.stageMetrics = metrics;
    elements.emptyState.hidden = true;
    elements.stageShell.hidden = false;
    elements.stageShell.style.width = `${metrics.displayWidth}px`;
    elements.stageShell.style.height = `${metrics.displayHeight}px`;
    renderCropOverlay();
  }

  function renderResultNow() {
    if (!session.source) {
      elements.resultCanvas.hidden = true;
      elements.resultEmptyState.hidden = false;
      elements.exportMeta.textContent = "PNG · 原始质量";
      return;
    }

    const preview = renderResultPreview(session, elements.resultCanvas, RESULT_PREVIEW_MAX_SIZE);
    if (!preview) {
      elements.resultCanvas.hidden = true;
      elements.resultEmptyState.hidden = false;
      return;
    }

    const format = getFormatConfig(session.exportOptions.format);
    const qualityPart = isQualityAdjustable(session.exportOptions.format)
      ? ` · 质量 ${Math.round(session.exportOptions.quality * 100)}%`
      : " · 原始质量";
    elements.resultCanvas.hidden = false;
    elements.resultEmptyState.hidden = true;
    elements.exportMeta.textContent = `${format.label} · ${preview.outputSize.width} × ${preview.outputSize.height}px${qualityPart}`;
  }

  function renderChrome() {
    renderToolTabs();
    renderToolPanel();
    renderWorkspaceHeader();
    renderHistoryButtons();
    renderStats();
    renderCropOverlay();
  }

  function renderAll({ previewMode = "immediate" } = {}) {
    renderStage();
    renderChrome();
    queueResultPreview(previewMode);
  }

  function applyTrackedChange(mutator, { forceResizeTargets = false, previewMode = "immediate" } = {}) {
    if (!session.source) {
      return;
    }

    const before = createSnapshot(session);
    mutator();
    syncSessionDerivedState(session, { forceResizeTargets });
    commitSnapshot(session, before);
    renderAll({ previewMode });
  }

  function getMinimumCropRatios() {
    const oriented = getOrientedSourceSize(session);
    return {
      minWidthRatio: MIN_CROP_SIZE / oriented.width,
      minHeightRatio: MIN_CROP_SIZE / oriented.height,
    };
  }

  function getStagePoint(clientX, clientY) {
    const rect = elements.stageCanvas.getBoundingClientRect();
    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height),
    };
  }

  function setCropRect(nextRect, { previewMode = "immediate" } = {}) {
    session.transforms.cropRect = nextRect;
    syncSessionDerivedState(session);
    if (session.ui.stageMetrics) {
      session.ui.stageMetrics.cropDisplayRect = getDisplayCropRect(
        session.transforms.cropRect,
        session.ui.stageMetrics.displayWidth,
        session.ui.stageMetrics.displayHeight
      );
    }
    renderCropOverlay();
    renderStats();
    queueResultPreview(previewMode);
  }

  function beginCropDrag(event) {
    if (!session.source || session.activeTool !== "crop" || elements.cropBox.hidden) {
      return;
    }

    const handle = event.target.dataset.handle;
    const point = getStagePoint(event.clientX, event.clientY);
    const displayRect = session.ui.stageMetrics.cropDisplayRect;

    session.ui.pendingHistorySnapshot = createSnapshot(session);
    if (handle) {
      session.ui.drag = {
        type: "resize",
        handle,
        origin: structuredClone(session.transforms.cropRect),
      };
    } else {
      session.ui.drag = {
        type: "move",
        offsetX: point.x - displayRect.x,
        offsetY: point.y - displayRect.y,
        origin: structuredClone(session.transforms.cropRect),
      };
    }

    elements.cropBox.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function resizeCropFreely(handle, point) {
    const origin = session.ui.drag.origin;
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
    const origin = session.ui.drag.origin;
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

  function onPointerMove(event) {
    if (!session.ui.drag || !session.ui.stageMetrics) {
      return;
    }

    const point = getStagePoint(event.clientX, event.clientY);
    const normalizedPoint = {
      x: point.x / session.ui.stageMetrics.displayWidth,
      y: point.y / session.ui.stageMetrics.displayHeight,
    };

    if (session.ui.drag.type === "move") {
      const displayRect = getDisplayCropRect(
        session.ui.drag.origin,
        session.ui.stageMetrics.displayWidth,
        session.ui.stageMetrics.displayHeight
      );
      const width = displayRect.width / session.ui.stageMetrics.displayWidth;
      const height = displayRect.height / session.ui.stageMetrics.displayHeight;
      setCropRect(
        {
          x: (point.x - session.ui.drag.offsetX) / session.ui.stageMetrics.displayWidth,
          y: (point.y - session.ui.drag.offsetY) / session.ui.stageMetrics.displayHeight,
          width,
          height,
        },
        { previewMode: "throttled" }
      );
      return;
    }

    const lockedRatio = getLockedCropRatio(session);
    if (lockedRatio) {
      setCropRect(
        resizeCropWithRatio(session.ui.drag.handle, normalizedPoint, lockedRatio),
        { previewMode: "throttled" }
      );
      return;
    }

    setCropRect(resizeCropFreely(session.ui.drag.handle, normalizedPoint), {
      previewMode: "throttled",
    });
  }

  function finishDrag(event) {
    if (!session.ui.drag) {
      return;
    }

    if (event?.pointerId !== undefined && elements.cropBox.hasPointerCapture(event.pointerId)) {
      elements.cropBox.releasePointerCapture(event.pointerId);
    }

    const snapshot = session.ui.pendingHistorySnapshot;
    session.ui.drag = null;
    session.ui.pendingHistorySnapshot = null;

    if (snapshot) {
      commitSnapshot(session, snapshot);
      renderHistoryButtons();
    }

    queueResultPreview("immediate");
  }

  function loadImageSource(source, fileName) {
    const loadToken = createLoadToken();
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (loadToken !== session.ui.activeLoadToken) {
        return;
      }

      resetSessionForSource(session, {
        image,
        name: fileName,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      renderAll();
    };
    image.src = source;
  }

  function loadSelectedFile(file) {
    if (!file) {
      return;
    }

    const loadToken = createLoadToken();
    const reader = new FileReader();
    reader.onload = () => {
      if (loadToken !== session.ui.activeLoadToken || typeof reader.result !== "string") {
        return;
      }

      loadImageSource(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleFileDrop(event) {
    event.preventDefault();
    session.ui.dropDepth = 0;
    elements.viewport.classList.remove("drag-over");

    const file = [...(event.dataTransfer?.files || [])].find((item) =>
      item.type.startsWith("image/")
    );
    loadSelectedFile(file);
  }

  const actions = {
    setCropAspectMode(mode) {
      applyTrackedChange(() => {
        session.transforms.cropAspectMode = mode;
        session.transforms.cropRect = constrainCropToAspect(
          session.transforms.cropRect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectWidth(value) {
      applyTrackedChange(() => {
        session.transforms.cropAspectMode = "custom";
        session.transforms.customAspect.width = toPositiveInteger(
          value,
          session.transforms.customAspect.width
        );
        session.transforms.cropRect = constrainCropToAspect(
          session.transforms.cropRect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectHeight(value) {
      applyTrackedChange(() => {
        session.transforms.cropAspectMode = "custom";
        session.transforms.customAspect.height = toPositiveInteger(
          value,
          session.transforms.customAspect.height
        );
        session.transforms.cropRect = constrainCropToAspect(
          session.transforms.cropRect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    centerCrop() {
      applyTrackedChange(() => {
        const rect = session.transforms.cropRect;
        session.transforms.cropRect = {
          ...rect,
          x: (1 - rect.width) / 2,
          y: (1 - rect.height) / 2,
        };
      });
    },
    resetCrop() {
      applyTrackedChange(
        () => {
          session.transforms.cropRect = createCenteredCropRect({
            ratio: getLockedCropRatio(session),
          });
        },
        { forceResizeTargets: !session.transforms.resize.enabled }
      );
    },
    setResizeEnabled(enabled) {
      applyTrackedChange(() => {
        session.transforms.resize.enabled = enabled;
        if (enabled) {
          syncResizeTargets(session, { force: true });
        }
      });
    },
    setResizeWidth(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const width = toPositiveInteger(value, baseSize.width);
        session.transforms.resize.targetWidth = width;
        if (session.transforms.resize.keepAspectRatio) {
          session.transforms.resize.targetHeight = scaleHeightFromWidth(baseSize, width);
        }
      });
    },
    setResizeHeight(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const height = toPositiveInteger(value, baseSize.height);
        session.transforms.resize.targetHeight = height;
        if (session.transforms.resize.keepAspectRatio) {
          session.transforms.resize.targetWidth = scaleWidthFromHeight(baseSize, height);
        }
      });
    },
    setKeepAspectRatio(keepAspectRatio) {
      applyTrackedChange(() => {
        session.transforms.resize.keepAspectRatio = keepAspectRatio;
        if (keepAspectRatio) {
          const baseSize = getCropBaseSize(session);
          session.transforms.resize.targetHeight = scaleHeightFromWidth(
            baseSize,
            session.transforms.resize.targetWidth
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
        session.transforms.rotateQuarterTurns = (session.transforms.rotateQuarterTurns + 3) % 4;
        session.transforms.cropRect = rotateCropRect(session.transforms.cropRect, 3);
        invalidateDerivedCaches(session);
      });
    },
    rotateRight() {
      applyTrackedChange(() => {
        session.transforms.rotateQuarterTurns = (session.transforms.rotateQuarterTurns + 1) % 4;
        session.transforms.cropRect = rotateCropRect(session.transforms.cropRect, 1);
        invalidateDerivedCaches(session);
      });
    },
    rotate180() {
      applyTrackedChange(() => {
        session.transforms.rotateQuarterTurns = (session.transforms.rotateQuarterTurns + 2) % 4;
        session.transforms.cropRect = rotateCropRect(session.transforms.cropRect, 2);
        invalidateDerivedCaches(session);
      });
    },
    resetOrientation() {
      applyTrackedChange(() => {
        session.transforms.rotateQuarterTurns = 0;
        session.transforms.flipX = false;
        session.transforms.flipY = false;
        session.transforms.cropRect = createCenteredCropRect({
          ratio: getLockedCropRatio(session),
        });
        invalidateDerivedCaches(session);
      });
    },
    flipHorizontal() {
      applyTrackedChange(() => {
        session.transforms.flipX = !session.transforms.flipX;
        session.transforms.cropRect = flipCropRect(session.transforms.cropRect, {
          horizontal: true,
        });
        invalidateDerivedCaches(session);
      });
    },
    flipVertical() {
      applyTrackedChange(() => {
        session.transforms.flipY = !session.transforms.flipY;
        session.transforms.cropRect = flipCropRect(session.transforms.cropRect, {
          vertical: true,
        });
        invalidateDerivedCaches(session);
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
      if (!session.source) {
        return;
      }

      const result = buildOutputCanvas(session);
      if (!result) {
        return;
      }

      const link = document.createElement("a");
      const quality = isQualityAdjustable(session.exportOptions.format)
        ? session.exportOptions.quality
        : undefined;
      link.href = result.canvas.toDataURL(session.exportOptions.format, quality);
      link.download = buildDownloadName(
        session.exportOptions.fileName || session.source.name,
        session.exportOptions.format
      );
      link.click();
    },
  };

  elements.imageInput.addEventListener("change", (event) => {
    loadSelectedFile(event.target.files?.[0]);
    event.target.value = "";
  });
  elements.loadDemoBtn.addEventListener("click", () => loadImageSource("./demo.svg", "demo.svg"));
  elements.resetSessionBtn.addEventListener("click", () => {
    if (!session.source) {
      return;
    }

    const before = createSnapshot(session);
    session.transforms = createDefaultTransforms();
    session.exportOptions = createDefaultExportOptions(session.source.name);
    invalidateDerivedCaches(session);
    syncSessionDerivedState(session, { forceResizeTargets: true });
    commitSnapshot(session, before);
    renderAll();
  });
  elements.undoBtn.addEventListener("click", () => {
    if (!undo(session)) {
      return;
    }

    syncSessionDerivedState(session);
    invalidateDerivedCaches(session);
    renderAll();
  });
  elements.redoBtn.addEventListener("click", () => {
    if (!redo(session)) {
      return;
    }

    syncSessionDerivedState(session);
    invalidateDerivedCaches(session);
    renderAll();
  });

  elements.cropBox.addEventListener("pointerdown", beginCropDrag);
  elements.viewport.addEventListener("dragenter", (event) => {
    event.preventDefault();
    session.ui.dropDepth += 1;
    elements.viewport.classList.add("drag-over");
  });
  elements.viewport.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.viewport.classList.add("drag-over");
  });
  elements.viewport.addEventListener("dragleave", () => {
    session.ui.dropDepth = Math.max(0, session.ui.dropDepth - 1);
    if (session.ui.dropDepth === 0) {
      elements.viewport.classList.remove("drag-over");
    }
  });
  elements.viewport.addEventListener("drop", handleFileDrop);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", finishDrag);
  window.addEventListener("resize", () => {
    if (!session.source) {
      return;
    }

    renderStage();
    queueResultPreview("immediate");
  });

  renderAll();
  loadImageSource("./demo.svg", "demo.svg");
}
