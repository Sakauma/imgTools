import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultEffects,
  getEffectsSummary,
  hasActiveEffects,
  normalizeEffects,
} from "../src/lib/effects.js";

test("normalizeEffects clamps poster effect controls", () => {
  assert.deepEqual(normalizeEffects({ grayscale: 1, threshold: 140, grain: -8 }), {
    ...createDefaultEffects(),
    grayscale: true,
    threshold: 100,
    grain: 0,
  });
});

test("effect summaries describe enabled scan effects", () => {
  assert.equal(hasActiveEffects(createDefaultEffects()), false);
  assert.equal(hasActiveEffects({ grayscale: true }), true);
  assert.match(getEffectsSummary({ grayscale: true, threshold: 30, paperLift: 20, grain: 12 }), /灰度/);
});
