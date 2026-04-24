import test from "node:test";
import assert from "node:assert/strict";

import { buildOutputCanvas } from "../src/lib/pipeline.js";
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

function installCanvasStub() {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return {
        width: 0,
        height: 0,
        getContext(type) {
          assert.equal(type, "2d");
          return createStubContext();
        },
      };
    },
  };

  return () => {
    globalThis.document = previousDocument;
  };
}

test("buildOutputCanvas reports final expanded canvas size separately from content size", () => {
  const restoreDocument = installCanvasStub();
  try {
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
  } finally {
    restoreDocument();
  }
});
