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
    activeTool: "crop",
    transforms: {
      cropRect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      cropAspectMode: "free",
      customAspect: { width: 4, height: 5 },
      rotateQuarterTurns: 0,
      flipX: false,
      flipY: false,
      resize: {
        enabled: false,
        targetWidth: 1200,
        targetHeight: 900,
        keepAspectRatio: true,
      },
    },
    exportOptions: {
      format: "image/png",
      quality: 0.92,
      fileName: "imgtools-output",
    },
    history: createHistoryState(),
  };
}

test("commitSnapshot records previous state and clears redo history", () => {
  const session = createSession();
  const before = createSnapshot(session);
  session.transforms.rotateQuarterTurns = 1;
  commitSnapshot(session, before);
  assert.equal(session.history.undoStack.length, 1);
  assert.equal(session.history.redoStack.length, 0);
});

test("undo and redo restore snapshots", () => {
  const session = createSession();
  const before = createSnapshot(session);
  session.transforms.rotateQuarterTurns = 1;
  commitSnapshot(session, before);

  assert.equal(undo(session), true);
  assert.equal(session.transforms.rotateQuarterTurns, 0);
  assert.equal(redo(session), true);
  assert.equal(session.transforms.rotateQuarterTurns, 1);
});
