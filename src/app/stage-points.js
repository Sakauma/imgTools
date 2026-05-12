import { clamp } from "../lib/geometry.js";

export function getStagePoint(elements, clientX, clientY) {
  const rect = elements.stageCanvas.getBoundingClientRect();
  return {
    x: clamp(clientX - rect.left, 0, rect.width),
    y: clamp(clientY - rect.top, 0, rect.height),
  };
}

export function getNormalizedStagePoint(elements, runtimeState, event) {
  const point = getStagePoint(elements, event.clientX, event.clientY);
  return {
    x: clamp((point.x / runtimeState.stageMetrics.displayWidth) * 100, 0, 100),
    y: clamp((point.y / runtimeState.stageMetrics.displayHeight) * 100, 0, 100),
  };
}
