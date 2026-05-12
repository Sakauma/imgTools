import { buildOutputCanvas } from "../lib/pipeline.js";
import { buildDownloadName, isQualityAdjustable } from "../lib/export.js";
import { resetSessionForSource } from "../lib/session.js";
import { resetRuntimeState, resetViewStateForSource } from "../lib/ui-state.js";

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, format, quality);
  });
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function createImageIO({
  session,
  viewState,
  runtimeState,
  elements,
  renderAll,
  doc = document,
  window = globalThis.window,
}) {
  function createLoadToken() {
    runtimeState.activeLoadToken += 1;
    return runtimeState.activeLoadToken;
  }

  function triggerDownload(href, fileName) {
    const link = doc.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
  }

  function loadImageSource(source, fileName) {
    const loadToken = createLoadToken();
    const image = new Image();
    runtimeState.loadError = "";
    image.decoding = "async";
    image.onload = () => {
      if (loadToken !== runtimeState.activeLoadToken) {
        return;
      }

      resetSessionForSource(session, {
        image,
        name: fileName,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      resetViewStateForSource(viewState);
      resetRuntimeState(runtimeState);
      renderAll();
    };
    image.onerror = () => {
      if (loadToken !== runtimeState.activeLoadToken) {
        return;
      }

      session.source = null;
      resetRuntimeState(runtimeState);
      runtimeState.loadError = "图片加载失败。请尝试其他图片文件。";
      renderAll();
    };
    image.src = source;
  }

  function loadSelectedFile(file) {
    if (!file) {
      return;
    }

    const loadToken = createLoadToken();
    const reader = new FileReader();
    runtimeState.loadError = "";
    reader.onload = () => {
      if (loadToken !== runtimeState.activeLoadToken || typeof reader.result !== "string") {
        return;
      }

      loadImageSource(reader.result, file.name);
    };
    reader.onerror = () => {
      if (loadToken !== runtimeState.activeLoadToken) {
        return;
      }

      session.source = null;
      resetRuntimeState(runtimeState);
      runtimeState.loadError = "文件读取失败。请重新选择图片。";
      renderAll();
    };
    reader.readAsDataURL(file);
  }

  async function downloadCurrentResult() {
    if (!session.source || runtimeState.exportStatus === "busy") {
      return;
    }

    runtimeState.exportStatus = "busy";
    runtimeState.exportError = "";
    renderAll();

    try {
      const result = buildOutputCanvas(session);
      if (!result) {
        throw new Error("当前没有可导出的结果。");
      }

      const quality = isQualityAdjustable(session.exportOptions.format)
        ? session.exportOptions.quality
        : undefined;
      const fileName = buildDownloadName(
        session.exportOptions.fileName || session.source.name,
        session.exportOptions.format
      );
      const blob = await canvasToBlob(result.canvas, session.exportOptions.format, quality);

      if (blob) {
        const objectUrl = window.URL.createObjectURL(blob);
        triggerDownload(objectUrl, fileName);
        window.setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 0);
        return;
      }

      triggerDownload(result.canvas.toDataURL(session.exportOptions.format, quality), fileName);
    } catch (error) {
      runtimeState.exportStatus = "error";
      runtimeState.exportError = getErrorMessage(error, "导出失败。请缩小输出尺寸后重试。");
      return;
    } finally {
      if (runtimeState.exportStatus !== "error") {
        runtimeState.exportStatus = "idle";
      }
      renderAll();
    }
  }

  function bindSourceEvents() {
    elements.imageInput.addEventListener("change", (event) => {
      loadSelectedFile(event.target.files?.[0]);
      event.target.value = "";
    });
    elements.loadDemoBtn.addEventListener("click", () => loadImageSource("./demo.svg", "demo.svg"));
  }

  return {
    bindSourceEvents,
    downloadCurrentResult,
    loadImageSource,
    loadSelectedFile,
  };
}
