/** @typedef {import("./types.js").RuntimeState} RuntimeState */
/** @typedef {import("./types.js").ViewState} ViewState */

/** @returns {ViewState} */
export function createViewState() {
  return {
    activeTool: "crop",
    adjustmentSection: "basic",
    selectedLayerId: null,
    brush: {
      color: "#111111",
      size: 18,
      opacity: 100,
      mode: "paint",
    },
  };
}

/** @returns {RuntimeState} */
export function createRuntimeState() {
  return {
    dropDepth: 0,
    drag: null,
    pendingHistorySnapshot: null,
    activeLoadToken: 0,
    stageMetrics: null,
    previewRenderId: 0,
    previewThrottleId: 0,
    lastPreviewAt: 0,
    loadError: "",
    exportStatus: "idle",
    exportError: "",
  };
}

/** @param {ViewState} viewState */
export function resetViewStateForSource(viewState) {
  viewState.activeTool = "crop";
  viewState.adjustmentSection = "basic";
  viewState.selectedLayerId = null;
  viewState.brush.color = "#111111";
  viewState.brush.size = 18;
  viewState.brush.opacity = 100;
  viewState.brush.mode = "paint";
}

/** @param {RuntimeState} runtimeState */
export function resetRuntimeState(runtimeState) {
  runtimeState.dropDepth = 0;
  runtimeState.drag = null;
  runtimeState.pendingHistorySnapshot = null;
  runtimeState.stageMetrics = null;
  runtimeState.previewRenderId = 0;
  runtimeState.previewThrottleId = 0;
  runtimeState.lastPreviewAt = 0;
  runtimeState.loadError = "";
  runtimeState.exportStatus = "idle";
  runtimeState.exportError = "";
}
