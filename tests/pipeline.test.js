import test from "node:test";
import assert from "node:assert/strict";

import { withCanvasFactory } from "../src/lib/canvas.js";
import {
  buildOutputCanvas,
  buildPreviewCanvas,
  getOutputSafetyStatus,
} from "../src/lib/pipeline.js";
import { createEditorSession, resetSessionForSource } from "../src/lib/session.js";

function createStubContext() {
  return {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    fillStyle: "#000000",
    filter: "none",
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    fillRect() {},
  };
}

function createStubCanvas(width, height) {
  return {
    width,
    height,
    getContext(type) {
      assert.equal(type, "2d");
      return createStubContext();
    },
  };
}

test("buildOutputCanvas reports final expanded canvas size separately from content size", () => {
  withCanvasFactory((width, height) => createStubCanvas(width, height), () => {
    const session = createEditorSession();
    resetSessionForSource(session, {
      image: { width: 1600, height: 900 },
      name: "wide.png",
      width: 1600,
      height: 900,
    });
    session.pipeline.crop.rect = { x: 0, y: 0, width: 1, height: 1 };
    session.pipeline.expand.enabled = true;
    session.pipeline.expand.aspectMode = "4:5";

    const result = buildOutputCanvas(session);

    assert.equal(result.contentSize.width, 1600);
    assert.equal(result.contentSize.height, 900);
    assert.equal(result.outputSize.width, 1600);
    assert.equal(result.outputSize.height, 2000);
    assert.equal(result.canvas.width, result.outputSize.width);
    assert.equal(result.canvas.height, result.outputSize.height);

    const cached = buildOutputCanvas(session);
    assert.deepEqual(cached.contentSize, result.contentSize);
    assert.deepEqual(cached.outputSize, result.outputSize);
  });
});

test("buildPreviewCanvas uses a smaller canvas while preserving full output metadata", () => {
  withCanvasFactory((width, height) => createStubCanvas(width, height), () => {
    const session = createEditorSession();
    resetSessionForSource(session, {
      image: { width: 1600, height: 900 },
      name: "wide.png",
      width: 1600,
      height: 900,
    });
    session.pipeline.crop.rect = { x: 0, y: 0, width: 1, height: 1 };

    const result = buildPreviewCanvas(session, { width: 320, height: 180 });

    assert.equal(result.outputSize.width, 1600);
    assert.equal(result.outputSize.height, 900);
    assert.equal(result.canvas.width, 320);
    assert.equal(result.canvas.height, 180);
  });
});

test("output safety warns on large results and blocks extreme exports", () => {
  const warning = getOutputSafetyStatus({ width: 6000, height: 7500 });
  assert.equal(warning.level, "warning");
  assert.match(warning.message, /45MP/);

  withCanvasFactory((width, height) => createStubCanvas(width, height), () => {
    const session = createEditorSession();
    resetSessionForSource(session, {
      image: { width: 100, height: 100 },
      name: "huge.png",
      width: 100,
      height: 100,
    });
    session.pipeline.crop.rect = { x: 0, y: 0, width: 1, height: 1 };
    session.pipeline.resize.enabled = true;
    session.pipeline.resize.targetWidth = 11_000;
    session.pipeline.resize.targetHeight = 11_000;

    assert.throws(() => buildOutputCanvas(session), /超过本地导出上限/);
  });
});
