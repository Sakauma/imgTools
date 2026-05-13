import { createActions } from "./app/actions.js";
import { collectElements } from "./app/dom.js";
import { createEditorStore } from "./app/editor-store.js";
import { createImageIO } from "./app/io.js";
import { setupInteractions } from "./app/interactions.js";
import { createPipelineWorkerClient } from "./app/pipeline-worker-client.js";
import { createRenderer } from "./app/render.js";
import { createEditorSession } from "./lib/session.js";
import { createRuntimeState, createViewState } from "./lib/ui-state.js";

export function createApp(doc = document) {
  const elements = collectElements(doc);
  const session = createEditorSession();
  const viewState = createViewState();
  const runtimeState = createRuntimeState();
  const viewWindow = doc.defaultView ?? globalThis.window;

  let toolActions;
  const renderer = createRenderer({
    session,
    viewState,
    runtimeState,
    elements,
    getActions: () => toolActions,
    window: viewWindow,
  });
  const store = createEditorStore({
    session,
    viewState,
    runtimeState,
    renderAll: renderer.renderAll,
  });
  const pipelineWorker = createPipelineWorkerClient({ scope: viewWindow });
  const io = createImageIO({
    session,
    viewState,
    runtimeState,
    elements,
    pipelineWorker,
    renderAll: renderer.renderAll,
    doc,
    window: viewWindow,
  });
  const { actions, bindSessionButtons } = createActions({
    store,
    elements,
    downloadCurrentResult: io.downloadCurrentResult,
  });

  toolActions = actions;

  bindSessionButtons();
  io.bindSourceEvents();
  setupInteractions({
    session,
    viewState,
    runtimeState,
    elements,
    loadSelectedFile: io.loadSelectedFile,
    renderCropOverlay: renderer.renderCropOverlay,
    renderChrome: renderer.renderChrome,
    renderHistoryButtons: renderer.renderHistoryButtons,
    renderStage: renderer.renderStage,
    renderStats: renderer.renderStats,
    queueResultPreview: renderer.queueResultPreview,
    window: viewWindow,
  });

  renderer.renderAll();
  io.loadImageSource("./demo.svg", "demo.svg");
}
