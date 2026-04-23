import test from "node:test";
import assert from "node:assert/strict";

import {
  flipCropRect,
  getOrientedSize,
  getPixelCropRect,
  rotateCropRect,
} from "../src/lib/geometry.js";

test("getOrientedSize swaps width and height on quarter turn", () => {
  assert.deepEqual(getOrientedSize(1600, 900, 1), { width: 900, height: 1600 });
  assert.deepEqual(getOrientedSize(1600, 900, 2), { width: 1600, height: 900 });
});

test("rotateCropRect rotates normalized crop clockwise", () => {
  assert.deepEqual(rotateCropRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, 1), {
    x: 0.4,
    y: 0.1,
    width: 0.4,
    height: 0.3,
  });
});

test("flipCropRect mirrors crop horizontally and vertically", () => {
  assert.deepEqual(
    flipCropRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, { horizontal: true }),
    {
      x: 0.6,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    }
  );
  assert.deepEqual(
    flipCropRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, { vertical: true }),
    {
      x: 0.1,
      y: 0.4,
      width: 0.3,
      height: 0.4,
    }
  );
});

test("getPixelCropRect clamps right and bottom edges inside image bounds", () => {
  assert.deepEqual(
    getPixelCropRect({ x: 0.75, y: 0.6, width: 0.27, height: 0.45 }, 1600, 1000),
    {
      x: 1200,
      y: 600,
      width: 400,
      height: 400,
    }
  );
});
