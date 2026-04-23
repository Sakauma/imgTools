export function createHistoryState() {
  return {
    undoStack: [],
    redoStack: [],
  };
}

export function createSnapshot(session, viewState) {
  return structuredClone({
    activeTool: viewState.activeTool,
    pipeline: session.pipeline,
    exportOptions: session.exportOptions,
  });
}

function snapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function restoreSnapshot(session, viewState, snapshot) {
  viewState.activeTool = snapshot.activeTool;
  session.pipeline = structuredClone(snapshot.pipeline);
  session.exportOptions = structuredClone(snapshot.exportOptions);
}

export function commitSnapshot(session, beforeSnapshot, afterSnapshot) {
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

export function undo(session, viewState) {
  const previous = session.history.undoStack.pop();
  if (!previous) {
    return false;
  }

  session.history.redoStack.push(createSnapshot(session, viewState));
  restoreSnapshot(session, viewState, previous);
  return true;
}

export function redo(session, viewState) {
  const next = session.history.redoStack.pop();
  if (!next) {
    return false;
  }

  session.history.undoStack.push(createSnapshot(session, viewState));
  restoreSnapshot(session, viewState, next);
  return true;
}
