const PRESETS = [
  { value: "free", label: "自由" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "21:9", label: "21:9" },
  { value: "custom", label: "自定义" },
];

export const cropTool = {
  id: "crop",
  label: "裁剪",
  hint: "拖动裁剪框内部可移动，拖四角可缩放。",
  render(root, session, actions) {
    root.innerHTML = `
      <div class="tool-section">
        <span>裁剪比例</span>
        <div class="ratio-row">
          ${PRESETS.map(
            (preset) =>
              `<button class="ratio-chip${session.transforms.cropAspectMode === preset.value ? " is-active" : ""}" type="button" data-ratio="${preset.value}">${preset.label}</button>`
          ).join("")}
        </div>
      </div>

      <div class="field-group two-col" id="customAspectFields" ${
        session.transforms.cropAspectMode === "custom" ? "" : "hidden"
      }>
        <label class="field">
          <span>宽度比</span>
          <input id="customAspectWidth" type="number" min="1" step="1" />
        </label>
        <label class="field">
          <span>高度比</span>
          <input id="customAspectHeight" type="number" min="1" step="1" />
        </label>
      </div>

      <div class="button-row">
        <button id="centerCropBtn" type="button">重新居中</button>
        <button id="resetCropBtn" type="button">重置裁剪框</button>
      </div>

      <div class="tool-summary">
        <strong>说明</strong>
        当前裁剪会在旋转/翻转之后生效，并作为尺寸调整与导出的输入区域。
      </div>
    `;

    root.querySelectorAll("[data-ratio]").forEach((button) => {
      button.addEventListener("click", () => actions.setCropAspectMode(button.dataset.ratio));
    });

    const customWidth = root.querySelector("#customAspectWidth");
    const customHeight = root.querySelector("#customAspectHeight");
    customWidth.value = session.transforms.customAspect.width;
    customHeight.value = session.transforms.customAspect.height;
    customWidth.addEventListener("input", (event) => actions.setCustomAspectWidth(event.target.value));
    customHeight.addEventListener("input", (event) =>
      actions.setCustomAspectHeight(event.target.value)
    );

    root.querySelector("#centerCropBtn").addEventListener("click", actions.centerCrop);
    root.querySelector("#resetCropBtn").addEventListener("click", actions.resetCrop);
  },
};
