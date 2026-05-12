import { createSnapshot } from "../lib/history.js";
import { createPaintLayer } from "../lib/layers.js";
import { getSelectedLayer, syncSelectedLayer } from "../lib/layer-selection.js";
import { invalidateOutputCache } from "../lib/session.js";
import { getNormalizedStagePoint } from "./stage-points.js";

const MIN_BRUSH_POINT_DISTANCE = 0.15;

function findSelectedPaintLayer(session, viewState) {
  return syncSelectedLayer(
    viewState,
    getSelectedLayer(session.pipeline.layers, viewState.selectedLayerId, { type: "paint", fallback: "first" })
  );
}

function ensurePaintLayer(session, viewState) {
  const existingLayer = findSelectedPaintLayer(session, viewState);
  if (existingLayer) {
    return existingLayer;
  }

  const layer = createPaintLayer({ zIndex: session.pipeline.layers.length + 10 });
  session.pipeline.layers.push(layer);
  viewState.selectedLayerId = layer.id;
  return layer;
}

export function isBrushDrag(drag) {
  return drag?.type === "paint";
}

export function createBrushInteraction({
  session,
  viewState,
  runtimeState,
  elements,
  renderStage,
  renderStats,
  queueResultPreview,
}) {
  function beginBrushStroke(event) {
    if (!session.source || viewState.activeTool !== "brush" || !runtimeState.stageMetrics) {
      return;
    }

    runtimeState.pendingHistorySnapshot = createSnapshot(session, viewState);
    const layer = ensurePaintLayer(session, viewState);
    const stroke = {
      points: [getNormalizedStagePoint(elements, runtimeState, event)],
      color: viewState.brush.color,
      size: viewState.brush.size,
      opacity: viewState.brush.opacity,
      mode: viewState.brush.mode,
    };
    layer.strokes.push(stroke);
    runtimeState.drag = {
      type: "paint",
      layerId: layer.id,
      strokeIndex: layer.strokes.length - 1,
    };
    invalidateOutputCache(session);
    elements.stageCanvas.setPointerCapture(event.pointerId);
    renderStage();
    renderStats();
    queueResultPreview("throttled");
    event.preventDefault();
  }

  function addBrushPoint(event) {
    const layer = session.pipeline.layers.find(
      (item) => item.id === runtimeState.drag.layerId && item.type === "paint"
    );
    const stroke = layer?.strokes[runtimeState.drag.strokeIndex];
    if (!stroke) {
      return;
    }

    const nextPoint = getNormalizedStagePoint(elements, runtimeState, event);
    const previousPoint = stroke.points.at(-1);
    const distance = previousPoint
      ? Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y)
      : Infinity;
    if (distance < MIN_BRUSH_POINT_DISTANCE) {
      return;
    }

    stroke.points.push(nextPoint);
    invalidateOutputCache(session);
    renderStage();
    renderStats();
    queueResultPreview("throttled");
  }

  return {
    addBrushPoint,
    beginBrushStroke,
  };
}
