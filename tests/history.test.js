import test from "node:test";
import assert from "node:assert/strict";

import {
  commitSnapshot,
  createHistoryState,
  createSnapshot,
  redo,
  undo,
} from "../src/lib/history.js";

function createSession() {
  return {
    pipeline: {
      orientation: {
        rotateQuarterTurns: 0,
        flipX: false,
        flipY: false,
      },
      crop: {
        rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        aspectMode: "free",
        customAspect: { width: 4, height: 5 },
      },
      resize: {
        enabled: false,
        targetWidth: 1200,
        targetHeight: 900,
        keepAspectRatio: true,
      },
      adjustments: {},
    },
    exportOptions: {
      format: "image/png",
      quality: 0.92,
      fileName: "imgtools-output",
    },
    history: createHistoryState(),
  };
}

function createViewState() {
  return {
    activeTool: "crop",
  };
}

test("commitSnapshot records previous state and clears redo history", () => {
  const session = createSession();
  const viewState = createViewState();
  const before = createSnapshot(session, viewState);
  session.pipeline.orientation.rotateQuarterTurns = 1;
  commitSnapshot(session, before, createSnapshot(session, viewState));
  assert.equal(session.history.undoStack.length, 1);
  assert.equal(session.history.redoStack.length, 0);
});

test("undo and redo restore snapshots", () => {
  const session = createSession();
  const viewState = createViewState();
  const before = createSnapshot(session, viewState);
  session.pipeline.orientation.rotateQuarterTurns = 1;
  commitSnapshot(session, before, createSnapshot(session, viewState));

  assert.equal(undo(session, viewState), true);
  assert.equal(session.pipeline.orientation.rotateQuarterTurns, 0);
  assert.equal(redo(session, viewState), true);
  assert.equal(session.pipeline.orientation.rotateQuarterTurns, 1);
});
