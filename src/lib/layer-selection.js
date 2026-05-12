import { normalizeLayers } from "./layers.js";

function fallbackLayer(layers, fallback) {
  if (fallback === "first") {
    return layers[0] ?? null;
  }
  if (fallback === "last") {
    return layers.at(-1) ?? null;
  }
  return null;
}

export function getLayersByType(layers = [], type) {
  return normalizeLayers(layers).filter((layer) => layer.type === type);
}

export function getSortedLayers(layers = []) {
  return normalizeLayers(layers);
}

export function getSelectedLayer(layers = [], selectedLayerId, { type = null, fallback = "last" } = {}) {
  const candidates = type ? layers.filter((layer) => layer.type === type) : layers;
  return candidates.find((layer) => layer.id === selectedLayerId) ?? fallbackLayer(candidates, fallback);
}

export function syncSelectedLayer(viewState, layer) {
  if (layer && viewState.selectedLayerId !== layer.id) {
    viewState.selectedLayerId = layer.id;
  }
  return layer;
}
