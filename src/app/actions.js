import { commitSnapshot, createSnapshot, redo, undo } from "../lib/history.js";
import {
  createDefaultExportOptions,
  createDefaultPipeline,
  invalidateCachesForSnapshotChange,
  syncSessionDerivedState,
} from "../lib/session.js";
import { resetViewStateForSource } from "../lib/ui-state.js";
import { createAdjustmentActions } from "./adjustment-actions.js";
import { createAppearanceActions } from "./appearance-actions.js";
import { createCropActions } from "./crop-actions.js";
import { createExportActions } from "./export-actions.js";
import { createOrientationActions } from "./orientation-actions.js";
import { createPosterActions } from "./poster-actions.js";
import { createResizeActions } from "./resize-actions.js";

export function createActions({
  session,
  viewState,
  runtimeState,
  elements,
  renderAll,
  downloadCurrentResult,
}) {
  function applyTrackedChange(mutator, { forceResizeTargets = false, previewMode = "immediate" } = {}) {
    if (!session.source) {
      return;
    }

    const before = createSnapshot(session, viewState);
    runtimeState.exportStatus = "idle";
    runtimeState.exportError = "";
    mutator();
    syncSessionDerivedState(session, { forceResizeTargets });
    const after = createSnapshot(session, viewState);
    invalidateCachesForSnapshotChange(session, before, after);
    commitSnapshot(session, before, after);
    renderAll({ previewMode });
  }

  const actions = {
    ...createCropActions({ session, applyTrackedChange }),
    ...createResizeActions({ session, applyTrackedChange }),
    ...createOrientationActions({ session, applyTrackedChange }),
    ...createExportActions({ session, applyTrackedChange, downloadCurrentResult }),
    ...createAdjustmentActions({ session, applyTrackedChange }),
    ...createAppearanceActions({ session, applyTrackedChange }),
    ...createPosterActions({ session, viewState, renderAll, applyTrackedChange }),
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
      runtimeState.exportStatus = "idle";
      runtimeState.exportError = "";
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
      runtimeState.exportStatus = "idle";
      runtimeState.exportError = "";
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
      runtimeState.exportStatus = "idle";
      runtimeState.exportError = "";
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
