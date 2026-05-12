function requireElement(doc, selector, name = selector) {
  const element = doc.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required UI element: ${name}`);
  }
  return element;
}

export function collectElements(doc) {
  return {
    imageInput: requireElement(doc, "#imageInput"),
    loadDemoBtn: requireElement(doc, "#loadDemoBtn"),
    resetSessionBtn: requireElement(doc, "#resetSessionBtn"),
    undoBtn: requireElement(doc, "#undoBtn"),
    redoBtn: requireElement(doc, "#redoBtn"),
    toolTabs: requireElement(doc, "#toolTabs"),
    toolPanel: requireElement(doc, "#toolPanel"),
    viewport: requireElement(doc, "#viewport"),
    emptyState: requireElement(doc, "#emptyState"),
    stageShell: requireElement(doc, "#stageShell"),
    stageCanvas: requireElement(doc, "#stageCanvas"),
    cropBox: requireElement(doc, "#cropBox"),
    activeToolLabel: requireElement(doc, "#activeToolLabel"),
    toolHint: requireElement(doc, "#toolHint"),
    resultFrame: requireElement(doc, ".result-frame", "resultFrame"),
    resultCanvas: requireElement(doc, "#resultCanvas"),
    resultEmptyState: requireElement(doc, "#resultEmptyState"),
    exportMeta: requireElement(doc, "#exportMeta"),
    sourceMeta: requireElement(doc, "#sourceMeta"),
    cropMeta: requireElement(doc, "#cropMeta"),
    outputMeta: requireElement(doc, "#outputMeta"),
    transformMeta: requireElement(doc, "#transformMeta"),
  };
}
