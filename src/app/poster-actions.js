import { createDefaultEffects, EFFECT_LIMITS } from "../lib/effects.js";
import { createShapeLayer, createTextLayer } from "../lib/layers.js";
import { applyPresetToPipeline } from "../lib/presets.js";

export function createPosterActions({ session, viewState, renderAll, applyTrackedChange }) {
  return {
    addTextLayer() {
      applyTrackedChange(() => {
        const layer = createTextLayer({ zIndex: session.pipeline.layers.length + 10 });
        session.pipeline.layers.push(layer);
        viewState.selectedLayerId = layer.id;
      });
    },
    addShapeLayer() {
      applyTrackedChange(() => {
        const layer = createShapeLayer({ zIndex: session.pipeline.layers.length + 10 });
        session.pipeline.layers.push(layer);
        viewState.selectedLayerId = layer.id;
      });
    },
    selectLayer(layerId) {
      viewState.selectedLayerId = layerId;
      renderAll();
    },
    updateLayer(layerId, patch) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId);
        if (layer) Object.assign(layer, patch);
      }, { previewMode: "throttled" });
    },
    moveLayer(layerId, direction) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId);
        if (layer) layer.zIndex += direction === "up" ? 1.5 : -1.5;
      });
    },
    duplicateLayer(layerId) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId);
        if (!layer) return;

        const copy = structuredClone(layer);
        copy.id = `${layer.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        copy.zIndex = session.pipeline.layers.length + 10;
        if (copy.type !== "paint") {
          copy.x = Math.min(100, copy.x + 4);
          copy.y = Math.min(100, copy.y + 4);
        }
        session.pipeline.layers.push(copy);
        viewState.selectedLayerId = copy.id;
      });
    },
    toggleLayerVisible(layerId) {
      applyTrackedChange(() => {
        const layer = session.pipeline.layers.find((item) => item.id === layerId);
        if (layer) layer.visible = !layer.visible;
      });
    },
    deleteLayer(layerId) {
      applyTrackedChange(() => {
        session.pipeline.layers = session.pipeline.layers.filter((layer) => layer.id !== layerId);
        viewState.selectedLayerId = session.pipeline.layers.at(-1)?.id ?? null;
      });
    },
    setEffectValue(key, value) {
      applyTrackedChange(() => {
        if (key in EFFECT_LIMITS) session.pipeline.effects[key] = Number(value);
      }, { previewMode: "throttled" });
    },
    setEffectToggle(key, enabled) {
      applyTrackedChange(() => {
        session.pipeline.effects[key] = Boolean(enabled);
      });
    },
    resetEffects() {
      applyTrackedChange(() => {
        session.pipeline.effects = createDefaultEffects();
      });
    },
    applyPreset(presetId) {
      applyTrackedChange(() => {
        applyPresetToPipeline(session.pipeline, presetId);
      });
    },
  };
}
