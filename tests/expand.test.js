import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultExpand,
  getExpandSummary,
  getExpandedSize,
  hasActiveExpand,
  normalizeExpand,
} from "../src/lib/expand.js";

test("createDefaultExpand returns the baseline expand stage", () => {
  assert.deepEqual(createDefaultExpand(), {
    enabled: false,
    aspectMode: "original",
    customAspect: { width: 4, height: 5 },
  });
});

test("normalizeExpand clamps to known aspect modes and positive custom ratio", () => {
  assert.deepEqual(
    normalizeExpand({
      enabled: 1,
      aspectMode: "unknown",
      customAspect: { width: -4, height: "7" },
    }),
    {
      enabled: true,
      aspectMode: "original",
      customAspect: { width: 4, height: 7 },
    }
  );
});

test("getExpandedSize widens or heightens output to match the target ratio", () => {
  assert.deepEqual(getExpandedSize({ width: 1200, height: 900 }, { enabled: true, aspectMode: "1:1" }), {
    width: 1200,
    height: 1200,
  });
  assert.deepEqual(getExpandedSize({ width: 1200, height: 900 }, { enabled: true, aspectMode: "16:9" }), {
    width: 1600,
    height: 900,
  });
});

test("expand summary only appears when the output ratio actually changes", () => {
  const baseSize = { width: 1200, height: 900 };
  assert.equal(hasActiveExpand(baseSize, { enabled: false, aspectMode: "1:1" }), false);
  assert.equal(hasActiveExpand(baseSize, { enabled: true, aspectMode: "original" }), false);
  assert.equal(hasActiveExpand(baseSize, { enabled: true, aspectMode: "4:5" }), true);
  assert.equal(getExpandSummary(baseSize, { enabled: true, aspectMode: "4:5" }), "扩边 4:5");
});
