import test from "node:test";
import assert from "node:assert/strict";

import {
  createPipelineWorkerClient,
  supportsPipelineWorker,
} from "../src/app/pipeline-worker-client.js";

class FakeWorker {
  static last = null;

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.messages = [];
    this.listeners = new Map();
    this.terminated = false;
    FakeWorker.last = this;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  emit(type, data) {
    (this.listeners.get(type) ?? []).forEach((listener) => listener({ data }));
  }

  terminate() {
    this.terminated = true;
  }
}

test("pipeline worker support requires Worker and OffscreenCanvas", () => {
  assert.equal(supportsPipelineWorker({ Worker: FakeWorker, OffscreenCanvas: function OffscreenCanvas() {} }), true);
  assert.equal(supportsPipelineWorker({ Worker: FakeWorker }), false);
  assert.equal(createPipelineWorkerClient({ WorkerCtor: undefined }), null);
});

test("pipeline worker client serializes source and render requests", async () => {
  const client = createPipelineWorkerClient({
    WorkerCtor: FakeWorker,
    scope: { OffscreenCanvas: function OffscreenCanvas() {} },
    workerUrl: new URL("file:///tmp/pipeline-worker.js"),
  });
  const worker = FakeWorker.last;

  const sourceReady = client.setSource("file:///tmp/demo.png", {
    name: "demo.png",
    width: 100,
    height: 80,
    token: "source-token",
  });
  assert.equal(worker.messages[0].type, "set-source");
  worker.emit("message", { id: 1, ok: true, result: { stale: false } });
  assert.deepEqual(await sourceReady, { stale: false });

  const outputReady = client.renderBlob({
    pipeline: { crop: {} },
    exportOptions: { format: "image/png" },
  });
  await Promise.resolve();
  assert.equal(worker.messages[1].type, "render-blob");
  worker.emit("message", { id: 2, ok: true, result: { blob: "blob" } });
  assert.deepEqual(await outputReady, { blob: "blob" });

  client.destroy();
  assert.equal(worker.terminated, true);
});
