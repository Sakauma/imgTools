import test from "node:test";
import assert from "node:assert/strict";

import {
  createShapeLayer,
  createTextLayer,
  getLayerSummary,
  normalizeLayer,
  normalizeLayers,
} from "../src/lib/layers.js";

test("normalizeLayer clamps common layer geometry and falls back to safe blend mode", () => {
  const layer = normalizeLayer({
    type: "text",
    x: 140,
    y: -20,
    opacity: 180,
    blendMode: "unsupported",
    fontSize: 999,
  });

  assert.equal(layer.x, 100);
  assert.equal(layer.y, 0);
  assert.equal(layer.opacity, 100);
  assert.equal(layer.blendMode, "normal");
  assert.equal(layer.fontSize, 320);
});

test("normalizeLayers sorts by zIndex and summarizes visible layer types", () => {
  const textLayer = createTextLayer({ id: "text", zIndex: 20 });
  const shapeLayer = createShapeLayer({ id: "shape", zIndex: 10 });
  const layers = normalizeLayers([textLayer, shapeLayer]);

  assert.deepEqual(layers.map((layer) => layer.id), ["shape", "text"]);
  assert.equal(getLayerSummary(layers), "图层 2 个 · 文字 1 · 色块 1");
});
