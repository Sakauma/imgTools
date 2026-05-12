import test from "node:test";
import assert from "node:assert/strict";

import {
  createEditorSession,
  getContentOutputSize,
  getCropBaseSize,
  getFinalOutputSize,
  getOutputCacheKey,
  getOutputPlan,
  resetSessionForSource,
  syncSessionDerivedState,
} from "../src/lib/session.js";

function createStubImage(width, height) {
  return { width, height };
}

test("output cache key ignores export format and quality changes", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: createStubImage(1600, 900),
    name: "demo.png",
    width: 1600,
    height: 900,
  });

  const before = getOutputCacheKey(session);
  session.exportOptions.format = "image/webp";
  session.exportOptions.quality = 0.56;
  session.exportOptions.fileName = "demo-export";

  assert.equal(getOutputCacheKey(session), before);
});

test("output cache key changes when appearance changes", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: createStubImage(1600, 900),
    name: "demo.png",
    width: 1600,
    height: 900,
  });

  const before = getOutputCacheKey(session);
  session.pipeline.appearance.cornerRadius = 24;
  syncSessionDerivedState(session);

  assert.notEqual(getOutputCacheKey(session), before);
});

test("output cache key changes when expand settings change", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: createStubImage(1600, 900),
    name: "demo.png",
    width: 1600,
    height: 900,
  });

  const before = getOutputCacheKey(session);
  session.pipeline.expand.enabled = true;
  session.pipeline.expand.aspectMode = "1:1";
  syncSessionDerivedState(session);

  assert.notEqual(getOutputCacheKey(session), before);
});

test("output cache key changes when poster effects or layers change", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: createStubImage(1600, 900),
    name: "demo.png",
    width: 1600,
    height: 900,
  });

  const before = getOutputCacheKey(session);
  session.pipeline.effects.grayscale = true;
  syncSessionDerivedState(session);
  const afterEffects = getOutputCacheKey(session);
  session.pipeline.layers.push({ id: "title", type: "text", text: "PANIC" });
  syncSessionDerivedState(session);

  assert.notEqual(afterEffects, before);
  assert.notEqual(getOutputCacheKey(session), afterEffects);
});

test("output plan centralizes crop, resize, and expanded output sizes", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: createStubImage(1600, 900),
    name: "demo.png",
    width: 1600,
    height: 900,
  });
  session.pipeline.crop.rect = { x: 0, y: 0, width: 1, height: 1 };
  session.pipeline.resize.enabled = true;
  session.pipeline.resize.targetWidth = 800;
  session.pipeline.resize.targetHeight = 600;
  session.pipeline.expand.enabled = true;
  session.pipeline.expand.aspectMode = "1:1";

  const plan = getOutputPlan(session);

  assert.deepEqual(plan.cropRect, { x: 0, y: 0, width: 1600, height: 900 });
  assert.deepEqual(plan.cropSize, { width: 1600, height: 900 });
  assert.deepEqual(plan.contentSize, { width: 800, height: 600 });
  assert.deepEqual(plan.outputSize, { width: 800, height: 800 });
  assert.deepEqual(getCropBaseSize(session), plan.cropSize);
  assert.deepEqual(getContentOutputSize(session), plan.contentSize);
  assert.deepEqual(getFinalOutputSize(session), plan.outputSize);
});
