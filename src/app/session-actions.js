import { commitSnapshot, createSnapshot, redo, undo } from "../lib/history.js";
import {
  createDefaultExportOptions,
  createDefaultPipeline,
  invalidateCachesForSnapshotChange,
  syncSessionDerivedState,
} from "../lib/session.js";
import { resetViewStateForSource } from "../lib/ui-state.js";

function clearRuntimeEditState(runtimeState) {
  runtimeState.drag = null;
  runtimeState.pendingHistorySnapshot = null;
  runtimeState.exportStatus = "idle";
  runtimeState.exportError = "";
}

export function createSessionActions({ session, viewState, runtimeState, renderAll }) {
  function resetSession() {
    if (!session.source) {
      return;
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
    renderAll();
  }

  function undoEdit() {
    const before = createSnapshot(session, viewState);
    if (!undo(session, viewState)) {
      return;
    }

    syncSessionDerivedState(session);
    clearRuntimeEditState(runtimeState);
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    renderAll();
  }

  function redoEdit() {
    const before = createSnapshot(session, viewState);
    if (!redo(session, viewState)) {
      return;
    }

    syncSessionDerivedState(session);
    clearRuntimeEditState(runtimeState);
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    renderAll();
  }

  return {
    redoEdit,
    resetSession,
    undoEdit,
  };
}

export function bindSessionButtons(elements, sessionActions) {
  elements.resetSessionBtn.addEventListener("click", sessionActions.resetSession);
  elements.undoBtn.addEventListener("click", sessionActions.undoEdit);
  elements.redoBtn.addEventListener("click", sessionActions.redoEdit);
}
