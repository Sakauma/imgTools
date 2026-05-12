import { commitSnapshot, createSnapshot } from "../lib/history.js";
import {
  invalidateCachesForSnapshotChange,
  syncSessionDerivedState,
} from "../lib/session.js";
import { createAdjustmentActions } from "./adjustment-actions.js";
import { createAppearanceActions } from "./appearance-actions.js";
import { createBrushActions } from "./brush-actions.js";
import { createCropActions } from "./crop-actions.js";
import { createExportActions } from "./export-actions.js";
import { createOrientationActions } from "./orientation-actions.js";
import { createPosterActions } from "./poster-actions.js";
import { createResizeActions } from "./resize-actions.js";
import { bindSessionButtons, createSessionActions } from "./session-actions.js";

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
    ...createBrushActions({ session, viewState, renderAll, applyTrackedChange }),
    ...createPosterActions({ session, viewState, renderAll, applyTrackedChange }),
  };
  const sessionActions = createSessionActions({ session, viewState, runtimeState, renderAll });

  return {
    actions: {
      ...actions,
      ...sessionActions,
    },
    bindSessionButtons: () => bindSessionButtons(elements, sessionActions),
  };
}
