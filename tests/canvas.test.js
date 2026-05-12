import test from "node:test";
import assert from "node:assert/strict";

import { createCanvas, getCanvasContext, withCanvasFactory } from "../src/lib/canvas.js";

test("createCanvas normalizes requested dimensions before using the active factory", () => {
  const context = {};

  withCanvasFactory((width, height) => ({
    width,
    height,
    getContext(type) {
      assert.equal(type, "2d");
      return context;
    },
  }), () => {
    const canvas = createCanvas(12.6, 0);

    assert.equal(canvas.width, 13);
    assert.equal(canvas.height, 1);
    assert.equal(getCanvasContext(canvas), context);
  });
});

test("getCanvasContext fails clearly when 2d rendering is unavailable", () => {
  assert.throws(
    () => getCanvasContext({ getContext: () => null }),
    /2D canvas context is unavailable/
  );
});
