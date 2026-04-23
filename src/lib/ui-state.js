export function createViewState() {
  return {
    activeTool: "crop",
    adjustmentSection: "basic",
  };
}

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
  };
}

export function resetViewStateForSource(viewState) {
  viewState.activeTool = "crop";
  viewState.adjustmentSection = "basic";
}

export function resetRuntimeState(runtimeState) {
  runtimeState.dropDepth = 0;
  runtimeState.drag = null;
  runtimeState.pendingHistorySnapshot = null;
  runtimeState.stageMetrics = null;
  runtimeState.previewRenderId = 0;
  runtimeState.previewThrottleId = 0;
  runtimeState.lastPreviewAt = 0;
}
