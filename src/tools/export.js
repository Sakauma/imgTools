import { EXPORT_FORMATS, isQualityAdjustable } from "../lib/export.js";

export const exportTool = {
  id: "export",
  label: "导出",
  hint: "最终输出遵循：旋转/翻转 → 裁剪 → 尺寸调整 → 编码。",
  render(root, session, actions, derived) {
    const canAdjustQuality = isQualityAdjustable(session.exportOptions.format);

    root.innerHTML = `
      <div class="field">
        <span>导出格式</span>
        <select id="exportFormatSelect"></select>
      </div>

      <div class="field quality-field${canAdjustQuality ? "" : " is-disabled"}">
        <span>质量</span>
        <input id="exportQualityRange" type="range" min="0.1" max="1" step="0.01" />
        <div class="range-meta">
          <strong class="quality-value" id="exportQualityValue"></strong>
          <span>仅 JPEG / WebP 可调</span>
        </div>
      </div>

      <label class="field">
        <span>文件名</span>
        <input id="exportFileNameInput" type="text" maxlength="64" />
      </label>

      <button id="downloadBtn" class="primary-button" type="button">下载导出结果</button>

      <div class="tool-summary">
        <strong>最终输出</strong>
        ${derived.outputSize.width} × ${derived.outputSize.height}px
      </div>
    `;

    const formatSelect = root.querySelector("#exportFormatSelect");
    EXPORT_FORMATS.forEach((format) => {
      const option = document.createElement("option");
      option.value = format.mime;
      option.textContent = format.label;
      option.selected = session.exportOptions.format === format.mime;
      formatSelect.append(option);
    });

    const qualityRange = root.querySelector("#exportQualityRange");
    const qualityValue = root.querySelector("#exportQualityValue");
    const fileNameInput = root.querySelector("#exportFileNameInput");
    const downloadBtn = root.querySelector("#downloadBtn");

    qualityRange.value = session.exportOptions.quality;
    qualityRange.disabled = !canAdjustQuality;
    qualityValue.textContent = canAdjustQuality
      ? `${Math.round(session.exportOptions.quality * 100)}%`
      : "原始质量";
    fileNameInput.value = session.exportOptions.fileName;
    downloadBtn.disabled = !session.source;

    formatSelect.addEventListener("change", (event) => actions.setExportFormat(event.target.value));
    qualityRange.addEventListener("input", (event) => actions.setExportQuality(event.target.value));
    fileNameInput.addEventListener("input", (event) => actions.setFileName(event.target.value));
    downloadBtn.addEventListener("click", actions.download);
  },
};
