import { createActions } from "./app/actions.js";
import { collectElements } from "./app/dom.js";
import { createImageIO } from "./app/io.js";
import { setupInteractions } from "./app/interactions.js";
import { createRenderer } from "./app/render.js";
import { createEditorSession } from "./lib/session.js";

export function createApp(doc = document) {
  const elements = collectElements(doc);
  const session = createEditorSession();
  const viewWindow = doc.defaultView ?? globalThis.window;

  let toolActions;
  const renderer = createRenderer({
    session,
    elements,
    getActions: () => toolActions,
    window: viewWindow,
  });
  const io = createImageIO({
    session,
    elements,
    renderAll: renderer.renderAll,
    doc,
    window: viewWindow,
  });
  const { actions, bindSessionButtons } = createActions({
    session,
    elements,
    renderAll: renderer.renderAll,
    downloadCurrentResult: io.downloadCurrentResult,
  });

  toolActions = actions;

  bindSessionButtons();
  io.bindSourceEvents();
  setupInteractions({
    session,
    elements,
    loadSelectedFile: io.loadSelectedFile,
    renderCropOverlay: renderer.renderCropOverlay,
    renderHistoryButtons: renderer.renderHistoryButtons,
    renderStage: renderer.renderStage,
    renderStats: renderer.renderStats,
    queueResultPreview: renderer.queueResultPreview,
    window: viewWindow,
  });

  renderer.renderAll();
  io.loadImageSource("./demo.svg", "demo.svg");
}
