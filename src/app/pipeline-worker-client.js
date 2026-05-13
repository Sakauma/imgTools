/**
 * @param {{ Worker?: unknown, OffscreenCanvas?: unknown }} [scope]
 */
export function supportsPipelineWorker(scope = globalThis) {
  return typeof scope.Worker === "function" && typeof scope.OffscreenCanvas === "function";
}

function createRequestError(error) {
  return error instanceof Error ? error : new Error(String(error || "Worker rendering failed."));
}

export function createPipelineWorkerClient({
  WorkerCtor = globalThis.Worker,
  workerUrl = new URL("./pipeline-worker.js", import.meta.url),
  scope = globalThis,
} = {}) {
  const supportScope = {
    Worker: WorkerCtor,
    OffscreenCanvas: scope.OffscreenCanvas,
  };
  if (typeof WorkerCtor !== "function" || !supportsPipelineWorker(supportScope)) {
    return null;
  }

  const worker = new WorkerCtor(workerUrl, { type: "module" });
  const pending = new Map();
  let nextRequestId = 1;
  let sourceReady = Promise.resolve();

  function rejectAll(error) {
    const requestError = createRequestError(error);
    pending.forEach(({ reject }) => reject(requestError));
    pending.clear();
  }

  worker.addEventListener("message", (event) => {
    const { id, ok, result, error } = event.data || {};
    const request = pending.get(id);
    if (!request) {
      return;
    }

    pending.delete(id);
    if (ok) {
      request.resolve(result);
    } else {
      request.reject(new Error(error || "Worker rendering failed."));
    }
  });
  worker.addEventListener("error", (event) => {
    rejectAll(event.error || event.message);
  });
  worker.addEventListener("messageerror", () => {
    rejectAll(new Error("Worker message serialization failed."));
  });

  function request(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = nextRequestId;
      nextRequestId += 1;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, ...payload });
    });
  }

  function setSource(sourceUrl, source) {
    sourceReady = request("set-source", { sourceUrl, source });
    return sourceReady;
  }

  function clearSource() {
    sourceReady = request("clear-source");
    return sourceReady;
  }

  async function renderBlob({ pipeline, exportOptions }) {
    await sourceReady;
    return request("render-blob", { pipeline, exportOptions });
  }

  function destroy() {
    rejectAll(new Error("Worker rendering client was destroyed."));
    worker.terminate();
  }

  return {
    clearSource,
    destroy,
    renderBlob,
    setSource,
  };
}
