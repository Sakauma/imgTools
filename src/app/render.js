import { getDisplayCropRect } from "../lib/geometry.js";
import { getFormatConfig, getOutputSize, isQualityAdjustable } from "../lib/export.js";
import { renderResultPreview, renderStageCanvas } from "../lib/pipeline.js";
import { getCropBaseSize } from "../lib/session.js";
import { toolMap, tools } from "../tools/index.js";

const RESULT_PREVIEW_MAX_SIZE = 420;
const DRAG_PREVIEW_INTERVAL = 90;

export function createRenderer({ session, elements, getActions, window = globalThis.window }) {
  function getDerivedData() {
    if (!session.source) {
      return {
        cropSize: { width: 0, height: 0 },
        outputSize: { width: 0, height: 0 },
        format: getFormatConfig(session.exportOptions.format),
      };
    }

    const cropSize = getCropBaseSize(session);
    const outputSize = getOutputSize(cropSize, session.pipeline.resize);
    return {
      cropSize,
      outputSize,
      format: getFormatConfig(session.exportOptions.format),
    };
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
    tool.render(elements.toolPanel, session, getActions(), getDerivedData());
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
    const rotation = session.pipeline.orientation.rotateQuarterTurns * 90;
    if (rotation) {
      bits.push(`旋转 ${rotation}°`);
    }
    if (session.pipeline.orientation.flipX) {
      bits.push("水平翻转");
    }
    if (session.pipeline.orientation.flipY) {
      bits.push("垂直翻转");
    }
    if (session.pipeline.resize.enabled) {
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
      session.pipeline.crop.rect,
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

  return {
    getDerivedData,
    queueResultPreview,
    renderAll,
    renderChrome,
    renderCropOverlay,
    renderHistoryButtons,
    renderResultNow,
    renderStage,
    renderStats,
  };
}
