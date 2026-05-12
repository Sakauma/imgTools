import test from "node:test";
import assert from "node:assert/strict";

import { createPaintLayer, createShapeLayer, createTextLayer } from "../src/lib/layers.js";
import {
  getLayersByType,
  getSelectedLayer,
  getSortedLayers,
  syncSelectedLayer,
} from "../src/lib/layer-selection.js";

test("layer selection helpers normalize and filter layers by type", () => {
  const layers = [
    createTextLayer({ id: "text-top", zIndex: 30 }),
    createShapeLayer({ id: "shape", zIndex: 10 }),
    createTextLayer({ id: "text-bottom", zIndex: 20 }),
  ];

  assert.deepEqual(getSortedLayers(layers).map((layer) => layer.id), ["shape", "text-bottom", "text-top"]);
  assert.deepEqual(getLayersByType(layers, "text").map((layer) => layer.id), ["text-bottom", "text-top"]);
});

test("getSelectedLayer respects type filters and fallback order", () => {
  const textLayer = createTextLayer({ id: "text", zIndex: 10 });
  const paintLayer = createPaintLayer({ id: "paint", zIndex: 20 });
  const shapeLayer = createShapeLayer({ id: "shape", zIndex: 30 });
  const layers = [textLayer, paintLayer, shapeLayer];

  assert.equal(getSelectedLayer(layers, "shape"), shapeLayer);
  assert.equal(getSelectedLayer(layers, "text", { type: "paint", fallback: "first" }), paintLayer);
  assert.equal(getSelectedLayer(layers, "missing", { fallback: "last" }), shapeLayer);
  assert.equal(getSelectedLayer(layers, "missing", { fallback: "none" }), null);
});

test("syncSelectedLayer updates view state only when a layer exists", () => {
  const viewState = { selectedLayerId: "old" };
  const layer = createPaintLayer({ id: "paint" });

  assert.equal(syncSelectedLayer(viewState, layer), layer);
  assert.equal(viewState.selectedLayerId, "paint");

  assert.equal(syncSelectedLayer(viewState, null), null);
  assert.equal(viewState.selectedLayerId, "paint");
});
