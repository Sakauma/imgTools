import { clampQuality, isQualityAdjustable } from "../lib/export.js";

export function createExportActions({ session, applyTrackedChange, downloadCurrentResult }) {
  return {
    setExportFormat(format) {
      applyTrackedChange(() => {
        session.exportOptions.format = format;
        if (!isQualityAdjustable(format)) {
          session.exportOptions.quality = 0.92;
        }
      });
    },
    setExportQuality(value) {
      applyTrackedChange(() => {
        session.exportOptions.quality = clampQuality(value);
      });
    },
    setFileName(value) {
      applyTrackedChange(() => {
        session.exportOptions.fileName = value.trim() || session.source?.name || "imgtools-output";
      });
    },
    download() {
      void downloadCurrentResult();
    },
  };
}
