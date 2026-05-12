import { commitSnapshot, createSnapshot } from "../lib/history.js";
import { invalidateOutputCache, syncSessionDerivedState } from "../lib/session.js";
import { createBrushInteraction, isBrushDrag } from "./brush-interactions.js";
import { createCropInteraction, isCropDrag } from "./crop-interactions.js";
import { getShortcutCommand } from "./shortcuts.js";

export function setupInteractions({
  session,
  viewState,
  runtimeState,
  elements,
  loadSelectedFile,
  renderCropOverlay,
  renderChrome,
  renderHistoryButtons,
  renderStage,
  renderStats,
  queueResultPreview,
  window = globalThis.window,
}) {
  const brushInteraction = createBrushInteraction({
    session,
    viewState,
    runtimeState,
    elements,
    renderStage,
    renderStats,
    queueResultPreview,
  });
  const cropInteraction = createCropInteraction({
    session,
    viewState,
    runtimeState,
    elements,
    renderCropOverlay,
    renderStats,
    queueResultPreview,
  });

  function onPointerMove(event) {
    if (!runtimeState.drag || !runtimeState.stageMetrics) {
      return;
    }

    if (isBrushDrag(runtimeState.drag)) {
      brushInteraction.addBrushPoint(event);
      return;
    }

    if (!isCropDrag(runtimeState.drag)) {
      return;
    }

    cropInteraction.moveOrResizeCrop(event);
  }

  function finishDrag(event) {
    if (!runtimeState.drag) {
      return;
    }

    if (event?.pointerId !== undefined && elements.cropBox.hasPointerCapture(event.pointerId)) {
      elements.cropBox.releasePointerCapture(event.pointerId);
    }
    if (event?.pointerId !== undefined && elements.stageCanvas.hasPointerCapture(event.pointerId)) {
      elements.stageCanvas.releasePointerCapture(event.pointerId);
    }

    const before = runtimeState.pendingHistorySnapshot;
    if (before) {
      syncSessionDerivedState(session);
      invalidateOutputCache(session);
    }
    const after = createSnapshot(session, viewState);
    runtimeState.drag = null;
    runtimeState.pendingHistorySnapshot = null;

    if (before) {
      commitSnapshot(session, before, after);
      renderHistoryButtons();
      renderStage();
      renderStats();
    }

    queueResultPreview("immediate");
  }

  function handleFileDrop(event) {
    event.preventDefault();
    runtimeState.dropDepth = 0;
    elements.viewport.classList.remove("drag-over");

    const file = [...(event.dataTransfer?.files || [])].find((item) =>
      item.type.startsWith("image/")
    );
    loadSelectedFile(file);
  }

  function handleKeyboardShortcut(event) {
    const command = getShortcutCommand(event);
    if (!command) {
      return;
    }

    if (command.type === "undo") {
      elements.undoBtn.click();
      event.preventDefault();
      return;
    }

    if (command.type === "redo") {
      elements.redoBtn.click();
      event.preventDefault();
      return;
    }

    if (command.type === "tool") {
      viewState.activeTool = command.toolId;
      renderStage();
      renderChrome();
      queueResultPreview("immediate");
      event.preventDefault();
    }
  }

  elements.cropBox.addEventListener("pointerdown", cropInteraction.beginCropDrag);
  elements.stageCanvas.addEventListener("pointerdown", brushInteraction.beginBrushStroke);
  elements.viewport.addEventListener("dragenter", (event) => {
    event.preventDefault();
    runtimeState.dropDepth += 1;
    elements.viewport.classList.add("drag-over");
  });
  elements.viewport.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.viewport.classList.add("drag-over");
  });
  elements.viewport.addEventListener("dragleave", () => {
    runtimeState.dropDepth = Math.max(0, runtimeState.dropDepth - 1);
    if (runtimeState.dropDepth === 0) {
      elements.viewport.classList.remove("drag-over");
    }
  });
  elements.viewport.addEventListener("drop", handleFileDrop);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", finishDrag);
  window.addEventListener("keydown", handleKeyboardShortcut);
  window.addEventListener("resize", () => {
    if (!session.source) {
      return;
    }

    renderStage();
    queueResultPreview("immediate");
  });
}
