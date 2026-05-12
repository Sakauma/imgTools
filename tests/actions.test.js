import test from "node:test";
import assert from "node:assert/strict";

import { createActions } from "../src/app/actions.js";
import { createEditorSession, resetSessionForSource } from "../src/lib/session.js";
import { createRuntimeState, createViewState } from "../src/lib/ui-state.js";

function createActionHarness() {
  const session = createEditorSession();
  const viewState = createViewState();
  const runtimeState = createRuntimeState();
  const renderCalls = [];

  resetSessionForSource(session, {
    image: { width: 1600, height: 900 },
    name: "source.png",
    width: 1600,
    height: 900,
  });

  const { actions } = createActions({
    session,
    viewState,
    runtimeState,
    elements: {},
    renderAll(options = {}) {
      renderCalls.push(options);
    },
    downloadCurrentResult() {},
  });

  return { actions, renderCalls, runtimeState, session, viewState };
}

function createButton() {
  let handler = () => {};
  return {
    addEventListener(eventName, nextHandler) {
      assert.equal(eventName, "click");
      handler = nextHandler;
    },
    click() {
      handler();
    },
  };
}

test("actions track history and invalidate output cache on pixel changes", () => {
  const { actions, renderCalls, session } = createActionHarness();
  session.cache.outputKey = "stale-output";
  session.cache.outputCanvas = { width: 1, height: 1 };
  session.cache.outputMeta = {
    cropSize: { width: 1, height: 1 },
    contentSize: { width: 1, height: 1 },
    outputSize: { width: 1, height: 1 },
  };

  actions.setAdjustmentValue("brightness", 25);

  assert.equal(session.pipeline.adjustments.brightness, 25);
  assert.equal(session.cache.outputKey, "");
  assert.equal(session.cache.outputCanvas, null);
  assert.equal(session.history.undoStack.length, 1);
  assert.equal(renderCalls.length, 1);
});

test("resize actions keep aspect ratio synced from crop size", () => {
  const { actions, session } = createActionHarness();

  actions.setResizeEnabled(true);
  actions.setResizeWidth(800);

  assert.equal(session.pipeline.resize.enabled, true);
  assert.equal(session.pipeline.resize.targetWidth, 800);
  assert.equal(session.pipeline.resize.targetHeight, 450);
});

test("bound undo and redo restore tracked action snapshots", () => {
  const session = createEditorSession();
  const viewState = createViewState();
  const runtimeState = createRuntimeState();
  const resetSessionBtn = createButton();
  const undoBtn = createButton();
  const redoBtn = createButton();
  let renderCount = 0;

  resetSessionForSource(session, {
    image: { width: 1600, height: 900 },
    name: "source.png",
    width: 1600,
    height: 900,
  });

  const { actions, bindSessionButtons } = createActions({
    session,
    viewState,
    runtimeState,
    elements: { resetSessionBtn, undoBtn, redoBtn },
    renderAll() {
      renderCount += 1;
    },
    downloadCurrentResult() {},
  });
  bindSessionButtons();

  actions.rotateRight();
  assert.equal(session.pipeline.orientation.rotateQuarterTurns, 1);

  undoBtn.click();
  assert.equal(session.pipeline.orientation.rotateQuarterTurns, 0);

  redoBtn.click();
  assert.equal(session.pipeline.orientation.rotateQuarterTurns, 1);
  assert.equal(renderCount, 3);
});
