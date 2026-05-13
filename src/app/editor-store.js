import { commitSnapshot, createSnapshot, redo, undo } from "../lib/history.js";
import {
  createDefaultExportOptions,
  createDefaultPipeline,
  invalidateCachesForSnapshotChange,
  syncSessionDerivedState,
} from "../lib/session.js";
import { resetViewStateForSource } from "../lib/ui-state.js";

/** @typedef {import("../lib/types.js").EditorSession} EditorSession */
/** @typedef {import("../lib/types.js").RuntimeState} RuntimeState */
/** @typedef {import("../lib/types.js").ViewState} ViewState */

function clearRuntimeEditState(runtimeState) {
  runtimeState.drag = null;
  runtimeState.pendingHistorySnapshot = null;
  runtimeState.exportStatus = "idle";
  runtimeState.exportError = "";
}

export function createEditorStore({ session, viewState, runtimeState, renderAll }) {
  function render(options = {}) {
    renderAll(options);
  }

  function applyTrackedChange(mutator, { forceResizeTargets = false, previewMode = "immediate" } = {}) {
    if (!session.source) {
      return false;
    }

    const before = createSnapshot(session, viewState);
    runtimeState.exportStatus = "idle";
    runtimeState.exportError = "";
    mutator({ session, viewState, runtimeState });
    syncSessionDerivedState(session, { forceResizeTargets });
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    commitSnapshot(session, before, after);
    render({ previewMode });
    return true;
  }

  function resetSession() {
    if (!session.source) {
      return false;
    }

    const before = createSnapshot(session, viewState);
    resetViewStateForSource(viewState);
    session.pipeline = createDefaultPipeline();
    session.exportOptions = createDefaultExportOptions(session.source.name);
    syncSessionDerivedState(session, { forceResizeTargets: true });
    clearRuntimeEditState(runtimeState);
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    commitSnapshot(session, before, after);
    render();
    return true;
  }

  function undoEdit() {
    const before = createSnapshot(session, viewState);
    if (!undo(session, viewState)) {
      return false;
    }

    syncSessionDerivedState(session);
    clearRuntimeEditState(runtimeState);
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    render();
    return true;
  }

  function redoEdit() {
    const before = createSnapshot(session, viewState);
    if (!redo(session, viewState)) {
      return false;
    }

    syncSessionDerivedState(session);
    clearRuntimeEditState(runtimeState);
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    render();
    return true;
  }

  return {
    session,
    viewState,
    runtimeState,
    applyTrackedChange,
    redoEdit,
    render,
    resetSession,
    undoEdit,
  };
}

export function bindStoreSessionButtons(elements, store) {
  elements.resetSessionBtn.addEventListener("click", store.resetSession);
  elements.undoBtn.addEventListener("click", store.undoEdit);
  elements.redoBtn.addEventListener("click", store.redoEdit);
}
