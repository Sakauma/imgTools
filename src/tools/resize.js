export const resizeTool = {
  id: "resize",
  label: "尺寸",
  hint: "基于裁剪结果调整最终输出宽高。",
  render(root, session, actions, derived) {
    root.innerHTML = `
      <label class="toggle-line">
        <span>启用尺寸调整</span>
        <input id="resizeEnabled" type="checkbox" />
      </label>

      <div class="field-group two-col">
        <label class="field">
          <span>输出宽度</span>
          <input id="resizeWidth" type="number" min="1" step="1" />
        </label>
        <label class="field">
          <span>输出高度</span>
          <input id="resizeHeight" type="number" min="1" step="1" />
        </label>
      </div>

      <label class="toggle-line">
        <span>锁定宽高比</span>
        <input id="keepAspectRatio" type="checkbox" />
      </label>

      <div class="button-row">
        <button id="useCropSizeBtn" type="button">使用裁剪尺寸</button>
        <button id="disableResizeBtn" type="button">关闭尺寸调整</button>
      </div>

      <div class="tool-summary">
        <strong>当前基准</strong>
        裁剪尺寸为 ${derived.cropSize.width} × ${derived.cropSize.height}px。
      </div>
    `;

    const enabled = root.querySelector("#resizeEnabled");
    const resizeWidth = root.querySelector("#resizeWidth");
    const resizeHeight = root.querySelector("#resizeHeight");
    const keepAspectRatio = root.querySelector("#keepAspectRatio");
    const disableResizeBtn = root.querySelector("#disableResizeBtn");

    enabled.checked = session.pipeline.resize.enabled;
    resizeWidth.value = session.pipeline.resize.targetWidth ?? derived.cropSize.width;
    resizeHeight.value = session.pipeline.resize.targetHeight ?? derived.cropSize.height;
    resizeWidth.disabled = !session.pipeline.resize.enabled;
    resizeHeight.disabled = !session.pipeline.resize.enabled;
    keepAspectRatio.checked = session.pipeline.resize.keepAspectRatio;
    keepAspectRatio.disabled = !session.pipeline.resize.enabled;
    disableResizeBtn.disabled = !session.pipeline.resize.enabled;

    enabled.addEventListener("change", (event) => actions.setResizeEnabled(event.target.checked));
    resizeWidth.addEventListener("input", (event) => actions.setResizeWidth(event.target.value));
    resizeHeight.addEventListener("input", (event) => actions.setResizeHeight(event.target.value));
    keepAspectRatio.addEventListener("change", (event) =>
      actions.setKeepAspectRatio(event.target.checked)
    );
    root.querySelector("#useCropSizeBtn").addEventListener("click", actions.useCropSize);
    disableResizeBtn.addEventListener("click", () => actions.setResizeEnabled(false));
  },
};
