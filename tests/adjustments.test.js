import test from "node:test";
import assert from "node:assert/strict";

import {
  applyColorAdjustmentsToPixels,
  applySharpenToPixels,
  getAdjustmentSummary,
  hasActiveAdjustments,
  normalizeAdjustments,
} from "../src/lib/adjustments.js";

test("normalizeAdjustments clamps numeric values and preserves toggles", () => {
  assert.deepEqual(
    normalizeAdjustments({
      brightness: 180,
      contrast: -140,
      blur: 99,
      sharpen: -10,
      grayscale: 1,
      sepia: 0,
    }),
    {
      brightness: 100,
      contrast: -100,
      saturation: 0,
      temperature: 0,
      tint: 0,
      grayscale: true,
      sepia: false,
      invert: false,
      blur: 12,
      sharpen: 0,
    }
  );
});

test("hasActiveAdjustments reports whether any adjustment is enabled", () => {
  assert.equal(hasActiveAdjustments({}), false);
  assert.equal(hasActiveAdjustments({ brightness: 20 }), true);
  assert.equal(hasActiveAdjustments({ grayscale: true }), true);
});

test("applyColorAdjustmentsToPixels changes brightness and invert output", () => {
  const source = new Uint8ClampedArray([40, 60, 80, 255]);

  const brighter = applyColorAdjustmentsToPixels(source, { brightness: 20 });
  assert.equal(brighter[0] > source[0], true);
  assert.equal(brighter[1] > source[1], true);
  assert.equal(brighter[2] > source[2], true);

  const inverted = applyColorAdjustmentsToPixels(source, { invert: true });
  assert.deepEqual(Array.from(inverted), [215, 195, 175, 255]);
});

test("applyColorAdjustmentsToPixels can desaturate to grayscale", () => {
  const source = new Uint8ClampedArray([200, 120, 40, 255]);
  const grayscale = applyColorAdjustmentsToPixels(source, { grayscale: true });

  assert.equal(grayscale[0], grayscale[1]);
  assert.equal(grayscale[1], grayscale[2]);
});

test("applySharpenToPixels keeps alpha and changes interior pixels when amount is enabled", () => {
  const width = 3;
  const height = 3;
  const source = new Uint8ClampedArray([
    20, 20, 20, 255,
    40, 40, 40, 255,
    20, 20, 20, 255,
    40, 40, 40, 255,
    100, 100, 100, 255,
    40, 40, 40, 255,
    20, 20, 20, 255,
    40, 40, 40, 255,
    20, 20, 20, 255,
  ]);

  const sharpened = applySharpenToPixels(source, width, height, 100);
  assert.equal(sharpened[4 * 4] > source[4 * 4], true);
  assert.equal(sharpened[4 * 4 + 3], 255);
});

test("getAdjustmentSummary compresses multiple active labels", () => {
  assert.equal(getAdjustmentSummary({}), "未调整");
  assert.equal(getAdjustmentSummary({ brightness: 10, contrast: 10 }), "亮度 · 对比度");
  assert.equal(
    getAdjustmentSummary({ brightness: 10, contrast: 10, saturation: 10, blur: 2 }),
    "亮度 · 对比度 · 饱和度 · 等 4 项"
  );
});
