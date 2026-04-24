import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultPipeline } from "../src/lib/session.js";
import { applyPresetToPipeline, getPreset, POSTER_PRESETS } from "../src/lib/presets.js";

test("poster presets expose the planned style options", () => {
  assert.deepEqual(POSTER_PRESETS.map((preset) => preset.id), [
    "manga-poster",
    "zine-scan",
    "xerox",
    "halftone",
  ]);
  assert.equal(getPreset("missing").id, "manga-poster");
});

test("applyPresetToPipeline updates adjustments and effects without changing layers", () => {
  const pipeline = createDefaultPipeline();
  pipeline.layers.push({ id: "keep", type: "text" });

  const preset = applyPresetToPipeline(pipeline, "xerox");

  assert.equal(preset.id, "xerox");
  assert.equal(pipeline.adjustments.saturation, -100);
  assert.equal(pipeline.effects.grayscale, true);
  assert.equal(pipeline.layers.length, 1);
});
