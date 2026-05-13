import { isQualityAdjustable } from "../lib/export.js";
import { buildOutputCanvas } from "../lib/pipeline.js";
import { createEditorSession, syncSessionDerivedState } from "../lib/session.js";

let sourceState = null;
let latestSourceRequestId = 0;

function getErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : "Worker rendering failed.";
}

function postSuccess(id, result = {}) {
  self.postMessage({ id, ok: true, result });
}

function postFailure(id, error) {
  self.postMessage({ id, ok: false, error: getErrorMessage(error) });
}

async function loadImageBitmap(sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok && response.status !== 0) {
    throw new Error("Worker 无法读取图片源。");
  }

  return createImageBitmap(await response.blob());
}

async function setSource({ id, sourceUrl, source }) {
  latestSourceRequestId = id;
  const image = await loadImageBitmap(sourceUrl);
  if (id !== latestSourceRequestId) {
    image.close?.();
    return { stale: true };
  }

  sourceState?.image?.close?.();
  sourceState = {
    image,
    name: source.name,
    width: source.width,
    height: source.height,
    token: source.token,
  };
  return { stale: false };
}

function clearSource() {
  latestSourceRequestId += 1;
  sourceState?.image?.close?.();
  sourceState = null;
}

async function renderBlob({ pipeline, exportOptions }) {
  if (!sourceState) {
    throw new Error("Worker 尚未加载图片源。");
  }

  const session = createEditorSession();
  session.source = sourceState;
  session.pipeline = structuredClone(pipeline);
  session.exportOptions = structuredClone(exportOptions);
  syncSessionDerivedState(session);

  const output = buildOutputCanvas(session);
  if (!output?.canvas?.convertToBlob) {
    throw new Error("当前浏览器不支持 OffscreenCanvas 导出。");
  }

  const blob = await output.canvas.convertToBlob({
    type: session.exportOptions.format,
    quality: isQualityAdjustable(session.exportOptions.format)
      ? session.exportOptions.quality
      : undefined,
  });

  return {
    blob,
    meta: {
      cropSize: output.cropSize,
      contentSize: output.contentSize,
      outputSize: output.outputSize,
    },
  };
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  const { id, type } = message;

  Promise.resolve()
    .then(async () => {
      if (type === "set-source") {
        return setSource(message);
      }
      if (type === "clear-source") {
        clearSource();
        return {};
      }
      if (type === "render-blob") {
        return renderBlob(message);
      }
      throw new Error(`Unknown worker request: ${type}`);
    })
    .then((result) => postSuccess(id, result))
    .catch((error) => postFailure(id, error));
});
