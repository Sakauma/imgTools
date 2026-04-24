import test from "node:test";
import assert from "node:assert/strict";

import { getExportSummary, getTransformSummary } from "../src/lib/summary.js";
import { getFormatConfig } from "../src/lib/export.js";
import { createEditorSession, resetSessionForSource } from "../src/lib/session.js";

test("transform summary includes effects and layers", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: { width: 1600, height: 900 },
    name: "demo.png",
    width: 1600,
    height: 900,
  });
  session.pipeline.effects.grayscale = true;
  session.pipeline.layers.push({ id: "title", type: "text", text: "HELLO" });

  const summary = getTransformSummary(session, {
    contentSize: { width: 1248, height: 780 },
  });

  assert.match(summary, /灰度/);
  assert.match(summary, /文字 1/);
});

test("export summary reports full output size", () => {
  const session = createEditorSession();
  resetSessionForSource(session, {
    image: { width: 1600, height: 900 },
    name: "demo.png",
    width: 1600,
    height: 900,
  });

  const summary = getExportSummary(
    session,
    { outputSize: { width: 1600, height: 900 } },
    getFormatConfig("image/png"),
    { width: 1600, height: 900 }
  );

  assert.match(summary, /PNG · 1600 × 900px/);
  assert.match(summary, /原始质量/);
});
