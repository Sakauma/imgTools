import test from "node:test";
import assert from "node:assert/strict";

import {
  createEditorSession,
  getOutputCacheKey,
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
