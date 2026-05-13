import { createAdjustmentActions } from "./adjustment-actions.js";
import { createAppearanceActions } from "./appearance-actions.js";
import { createBrushActions } from "./brush-actions.js";
import { createCropActions } from "./crop-actions.js";
import { createExportActions } from "./export-actions.js";
import { createOrientationActions } from "./orientation-actions.js";
import { createPosterActions } from "./poster-actions.js";
import { createResizeActions } from "./resize-actions.js";
import { bindStoreSessionButtons } from "./editor-store.js";

export function createActions({
  store,
  elements,
  downloadCurrentResult,
}) {
  const { session, viewState } = store;

  const actions = {
    ...createCropActions({ session, applyTrackedChange: store.applyTrackedChange }),
    ...createResizeActions({ session, applyTrackedChange: store.applyTrackedChange }),
    ...createOrientationActions({ session, applyTrackedChange: store.applyTrackedChange }),
    ...createExportActions({ session, applyTrackedChange: store.applyTrackedChange, downloadCurrentResult }),
    ...createAdjustmentActions({ session, applyTrackedChange: store.applyTrackedChange }),
    ...createAppearanceActions({ session, applyTrackedChange: store.applyTrackedChange }),
    ...createBrushActions({
      session,
      viewState,
      renderAll: store.render,
      applyTrackedChange: store.applyTrackedChange,
    }),
    ...createPosterActions({
      session,
      viewState,
      renderAll: store.render,
      applyTrackedChange: store.applyTrackedChange,
    }),
    redoEdit: store.redoEdit,
    resetSession: store.resetSession,
    undoEdit: store.undoEdit,
  };

  return {
    actions,
    bindSessionButtons: () => bindStoreSessionButtons(elements, store),
  };
}
