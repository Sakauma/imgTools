import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultAppearance,
  getAppearanceSummary,
  hasActiveAppearance,
  normalizeAppearance,
} from "../src/lib/appearance.js";

test("createDefaultAppearance returns the baseline appearance stage", () => {
  assert.deepEqual(createDefaultAppearance(), {
    backgroundColor: null,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
  });
});

test("normalizeAppearance clamps numeric values and validates colors", () => {
  assert.deepEqual(
    normalizeAppearance({
      backgroundColor: "red",
      cornerRadius: 999,
      borderWidth: -4,
      borderColor: "#ff00aa",
    }),
    {
      backgroundColor: null,
      cornerRadius: 512,
      borderWidth: 0,
      borderColor: "#ff00aa",
    }
  );
});

test("hasActiveAppearance reports when any appearance setting is enabled", () => {
  assert.equal(hasActiveAppearance({}), false);
  assert.equal(hasActiveAppearance({ backgroundColor: "#ffffff" }), true);
  assert.equal(hasActiveAppearance({ cornerRadius: 12 }), true);
  assert.equal(hasActiveAppearance({ borderWidth: 2 }), true);
});

test("getAppearanceSummary reflects active appearance settings", () => {
  assert.equal(getAppearanceSummary({}), "默认");
  assert.equal(
    getAppearanceSummary({ backgroundColor: "#ffffff", cornerRadius: 16 }),
    "背景填充 · 圆角"
  );
  assert.equal(getAppearanceSummary({ borderWidth: 3 }), "边框");
});
