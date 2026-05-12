import { createPaintLayer } from "../lib/layers.js";

export function createBrushActions({ session, viewState, renderAll, applyTrackedChange }) {
  return {
    addPaintLayer() {
      applyTrackedChange(() => {
        const layer = createPaintLayer({ zIndex: session.pipeline.layers.length + 10 });
        session.pipeline.layers.push(layer);
        viewState.selectedLayerId = layer.id;
      });
    },
    clearPaintLayer(layerId) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId && item.type === "paint");
        if (layer) {
          layer.strokes = [];
        }
      });
    },
    removeLastPaintStroke(layerId) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId && item.type === "paint");
        if (layer) {
          layer.strokes = layer.strokes.slice(0, -1);
        }
      });
    },
    setBrushColor(color) {
      viewState.brush.color = color;
      renderAll();
    },
    setBrushSize(size) {
      viewState.brush.size = Number(size);
      renderAll();
    },
    setBrushOpacity(opacity) {
      viewState.brush.opacity = Number(opacity);
      renderAll();
    },
    setBrushMode(mode) {
      viewState.brush.mode = mode === "erase" ? "erase" : "paint";
      renderAll();
    },
  };
}
