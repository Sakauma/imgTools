import { getExpandedSize } from "../lib/expand.js";
import { getDisplayCropRect } from "../lib/geometry.js";
import { getFormatConfig, getOutputSize } from "../lib/export.js";
import { renderResultPreview, renderStageCanvas } from "../lib/pipeline.js";
import { getCropBaseSize } from "../lib/session.js";
import { getExportSummary, getTransformSummary } from "../lib/summary.js";
import { toolMap, tools } from "../tools/index.js";

const RESULT_PREVIEW_MAX_SIZE = 420;
const DRAG_PREVIEW_INTERVAL = 90;

export function createRenderer({
  session,
  viewState,
  runtimeState,
  elements,
  getActions,
  window = globalThis.window,
}) {
  function getDerivedData() {
    if (!session.source) {
      return {
        cropSize: { width: 0, height: 0 },
        contentSize: { width: 0, height: 0 },
        outputSize: { width: 0, height: 0 },
        format: getFormatConfig(session.exportOptions.format),
      };
    }

    const cropSize = getCropBaseSize(session);
    const contentSize = getOutputSize(cropSize, session.pipeline.resize);
    const outputSize = getExpandedSize(contentSize, session.pipeline.expand);
    return {
      cropSize,
      contentSize,
      outputSize,
      format: getFormatConfig(session.exportOptions.format),
    };
  }

  function cancelPreviewThrottle() {
    if (!runtimeState.previewThrottleId) {
      return;
    }

    window.clearTimeout(runtimeState.previewThrottleId);
    runtimeState.previewThrottleId = 0;
  }

  function queuePreviewFrame() {
    if (runtimeState.previewRenderId) {
      return;
    }

    runtimeState.previewRenderId = window.requestAnimationFrame(() => {
      runtimeState.previewRenderId = 0;
      renderResultNow();
      runtimeState.lastPreviewAt = performance.now();
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

    const elapsed = performance.now() - runtimeState.lastPreviewAt;
    if (elapsed >= DRAG_PREVIEW_INTERVAL) {
      queuePreviewFrame();
      return;
    }

    if (runtimeState.previewThrottleId) {
      return;
    }

    runtimeState.previewThrottleId = window.setTimeout(() => {
      runtimeState.previewThrottleId = 0;
      queuePreviewFrame();
    }, Math.max(DRAG_PREVIEW_INTERVAL - elapsed, 16));
  }

  function renderToolTabs() {
    elements.toolTabs.innerHTML = tools
      .map(
        (tool) => `
          <button class="tool-tab${viewState.activeTool === tool.id ? " is-active" : ""}" type="button" data-tool-id="${tool.id}" aria-pressed="${viewState.activeTool === tool.id}">
            ${tool.label}
          </button>
        `
      )
      .join("");

    elements.toolTabs.querySelectorAll("[data-tool-id]").forEach((button) => {
      button.addEventListener("click", () => {
        viewState.activeTool = button.dataset.toolId;
        renderChrome();
      });
    });
  }

  function renderToolPanel() {
    const tool = toolMap.get(viewState.activeTool) ?? tools[0];
    tool.render(elements.toolPanel, session, viewState, getActions(), getDerivedData());
  }

  function renderWorkspaceHeader() {
    const tool = toolMap.get(viewState.activeTool) ?? tools[0];
    elements.activeToolLabel.textContent = tool.label;
    elements.toolHint.textContent = tool.hint;
  }

  function renderHistoryButtons() {
    elements.undoBtn.disabled = session.history.undoStack.length === 0;
    elements.redoBtn.disabled = session.history.redoStack.length === 0;
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
    elements.transformMeta.textContent = getTransformSummary(session, derived);
  }

  function renderCropOverlay() {
    const showCrop = Boolean(session.source && viewState.activeTool === "crop" && runtimeState.stageMetrics);
    elements.cropBox.hidden = !showCrop;

    if (!showCrop) {
      return;
    }

    const displayRect = getDisplayCropRect(
      session.pipeline.crop.rect,
      runtimeState.stageMetrics.displayWidth,
      runtimeState.stageMetrics.displayHeight
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
      runtimeState.stageMetrics = null;
      return;
    }

    const viewportBounds = elements.viewport.getBoundingClientRect();
    const outputPreview = viewState.activeTool !== "crop";
    const metrics = renderStageCanvas(
      session,
      elements.stageCanvas,
      viewportBounds.width,
      viewportBounds.height,
      { outputPreview }
    );

    runtimeState.stageMetrics = metrics;
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

    const frameBounds = elements.resultFrame.getBoundingClientRect();
    const previewMaxSize = {
      width: Math.max(96, Math.min(RESULT_PREVIEW_MAX_SIZE, frameBounds.width - 20)),
      height: Math.max(96, Math.min(RESULT_PREVIEW_MAX_SIZE, frameBounds.height - 20)),
    };
    const preview = renderResultPreview(session, elements.resultCanvas, previewMaxSize);
    if (!preview) {
      elements.resultCanvas.hidden = true;
      elements.resultEmptyState.hidden = false;
      return;
    }

    const format = getFormatConfig(session.exportOptions.format);
    const contentSize = getOutputSize(preview.cropSize, session.pipeline.resize);
    elements.resultCanvas.hidden = false;
    elements.resultEmptyState.hidden = true;
    elements.exportMeta.textContent = getExportSummary(session, preview, format, contentSize);
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
