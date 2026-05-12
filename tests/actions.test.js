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

test("brush actions add and edit paint layers through history", () => {
  const { actions, session, viewState } = createActionHarness();

  actions.addPaintLayer();
  const layer = session.pipeline.layers.find((item) => item.type === "paint");

  assert.ok(layer);
  assert.equal(viewState.selectedLayerId, layer.id);
  assert.equal(session.history.undoStack.length, 1);

  layer.strokes.push({
    points: [{ x: 10, y: 10 }],
    color: "#111111",
    size: 12,
    opacity: 100,
    mode: "paint",
  });
  actions.removeLastPaintStroke(layer.id);

  assert.equal(layer.strokes.length, 0);
  assert.equal(session.history.undoStack.length, 2);
});

test("layer actions duplicate and toggle generic layers", () => {
  const { actions, session, viewState } = createActionHarness();

  actions.addTextLayer();
  const original = session.pipeline.layers.find((item) => item.type === "text");
  actions.duplicateLayer(original.id);
  const duplicated = session.pipeline.layers.find(
    (item) => item.type === "text" && item.id !== original.id
  );

  assert.ok(duplicated);
  assert.equal(viewState.selectedLayerId, duplicated.id);
  assert.equal(duplicated.text, original.text);
  assert.notEqual(duplicated.x, original.x);

  actions.toggleLayerVisible(duplicated.id);
  const hiddenLayer = session.pipeline.layers.find((item) => item.id === duplicated.id);
  assert.equal(hiddenLayer.visible, false);
});

test("session actions reset pipeline and clear transient edit state", () => {
  const { actions, runtimeState, session, viewState } = createActionHarness();

  actions.setAdjustmentValue("brightness", 35);
  viewState.activeTool = "brush";
  runtimeState.drag = { type: "paint" };
  runtimeState.pendingHistorySnapshot = { session: {}, viewState: {} };
  runtimeState.exportStatus = "error";
  runtimeState.exportError = "stale";

  actions.resetSession();

  assert.equal(session.pipeline.adjustments.brightness, 0);
  assert.equal(viewState.activeTool, "crop");
  assert.equal(runtimeState.drag, null);
  assert.equal(runtimeState.pendingHistorySnapshot, null);
  assert.equal(runtimeState.exportStatus, "idle");
  assert.equal(runtimeState.exportError, "");
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
