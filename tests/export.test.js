import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDownloadName,
  getOutputSize,
  isQualityAdjustable,
  scaleHeightFromWidth,
  scaleWidthFromHeight,
} from "../src/lib/export.js";

test("getOutputSize returns crop size when resize is disabled", () => {
  assert.deepEqual(
    getOutputSize({ width: 1200, height: 800 }, { enabled: false, targetWidth: 640, targetHeight: 480 }),
    {
      width: 1200,
      height: 800,
    }
  );
});

test("getOutputSize respects explicit resize targets", () => {
  assert.deepEqual(
    getOutputSize({ width: 1200, height: 800 }, { enabled: true, targetWidth: 640, targetHeight: 480 }),
    {
      width: 640,
      height: 480,
    }
  );
});

test("scale helpers preserve aspect ratio", () => {
  assert.equal(scaleHeightFromWidth({ width: 1600, height: 900 }, 800), 450);
  assert.equal(scaleWidthFromHeight({ width: 1600, height: 900 }, 450), 800);
});

test("buildDownloadName sanitizes file names and appends correct extension", () => {
  assert.equal(buildDownloadName("demo:image", "image/webp"), "demo-image.webp");
});

test("quality is adjustable only for jpeg and webp", () => {
  assert.equal(isQualityAdjustable("image/png"), false);
  assert.equal(isQualityAdjustable("image/jpeg"), true);
  assert.equal(isQualityAdjustable("image/webp"), true);
});
