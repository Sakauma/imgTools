export function createHistoryState() {
  return {
    undoStack: [],
    redoStack: [],
  };
}

export function createSnapshot(session) {
  return structuredClone({
    activeTool: session.activeTool,
    transforms: session.transforms,
    exportOptions: session.exportOptions,
  });
}

function snapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function restoreSnapshot(session, snapshot) {
  session.activeTool = snapshot.activeTool;
  session.transforms = structuredClone(snapshot.transforms);
  session.exportOptions = structuredClone(snapshot.exportOptions);
}

export function commitSnapshot(session, beforeSnapshot) {
  const afterSnapshot = createSnapshot(session);
  if (snapshotsEqual(beforeSnapshot, afterSnapshot)) {
    return false;
  }

  session.history.undoStack.push(beforeSnapshot);
  if (session.history.undoStack.length > 50) {
    session.history.undoStack.shift();
  }

  session.history.redoStack = [];
  return true;
}

export function undo(session) {
  const previous = session.history.undoStack.pop();
  if (!previous) {
    return false;
  }

  session.history.redoStack.push(createSnapshot(session));
  restoreSnapshot(session, previous);
  return true;
}

export function redo(session) {
  const next = session.history.redoStack.pop();
  if (!next) {
    return false;
  }

  session.history.undoStack.push(createSnapshot(session));
  restoreSnapshot(session, next);
  return true;
}
