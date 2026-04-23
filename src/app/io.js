import { buildOutputCanvas } from "../lib/pipeline.js";
import { buildDownloadName, isQualityAdjustable } from "../lib/export.js";
import { resetSessionForSource } from "../lib/session.js";

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, format, quality);
  });
}

export function createImageIO({
  session,
  elements,
  renderAll,
  doc = document,
  window = globalThis.window,
}) {
  function createLoadToken() {
    session.ui.activeLoadToken += 1;
    return session.ui.activeLoadToken;
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
    image.decoding = "async";
    image.onload = () => {
      if (loadToken !== session.ui.activeLoadToken) {
        return;
      }

      resetSessionForSource(session, {
        image,
        name: fileName,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
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
    reader.onload = () => {
      if (loadToken !== session.ui.activeLoadToken || typeof reader.result !== "string") {
        return;
      }

      loadImageSource(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  }

  async function downloadCurrentResult() {
    if (!session.source) {
      return;
    }

    const result = buildOutputCanvas(session);
    if (!result) {
      return;
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
