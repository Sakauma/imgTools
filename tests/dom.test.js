import test from "node:test";
import assert from "node:assert/strict";

import { collectElements } from "../src/app/dom.js";

const selectors = [
  "#imageInput",
  "#loadDemoBtn",
  "#resetSessionBtn",
  "#undoBtn",
  "#redoBtn",
  "#toolTabs",
  "#toolPanel",
  "#viewport",
  "#emptyState",
  "#stageShell",
  "#stageCanvas",
  "#cropBox",
  "#activeToolLabel",
  "#toolHint",
  ".result-frame",
  "#resultCanvas",
  "#resultEmptyState",
  "#exportMeta",
  "#sourceMeta",
  "#cropMeta",
  "#outputMeta",
  "#transformMeta",
];

test("collectElements fails fast when required UI nodes are missing", () => {
  assert.throws(
    () => collectElements({ querySelector: () => null }),
    /Missing required UI element: #imageInput/
  );
});

test("collectElements returns every required node when selectors resolve", () => {
  const elements = new Map(selectors.map((selector) => [selector, { selector }]));
  const collected = collectElements({
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  });

  assert.equal(collected.imageInput.selector, "#imageInput");
  assert.equal(collected.resultFrame.selector, ".result-frame");
  assert.equal(Object.keys(collected).length, selectors.length);
});
