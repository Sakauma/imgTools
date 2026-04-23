import {
  APPEARANCE_LIMITS,
  getAppearanceSummary,
  normalizeAppearance,
} from "../lib/appearance.js";

export const appearanceTool = {
  id: "appearance",
  label: "外观",
  hint: "外观阶段只影响最终输出样式，不改变裁剪区域和输出尺寸。",
  render(root, session, viewState, actions, derived) {
    const appearance = normalizeAppearance(session.pipeline.appearance);
    const minSide = Math.max(1, Math.min(derived.outputSize.width, derived.outputSize.height));
    const maxCornerRadius = Math.max(1, Math.min(Math.floor(minSide / 2), APPEARANCE_LIMITS.cornerRadius.max));
    const maxBorderWidth = Math.max(1, Math.min(Math.floor(minSide / 4), APPEARANCE_LIMITS.borderWidth.max));
    const backgroundColor = appearance.backgroundColor ?? "#f8fafc";
    const backgroundEnabled = Boolean(appearance.backgroundColor);
    const borderEnabled = appearance.borderWidth > 0;

    root.innerHTML = `
      <div class="tool-section tool-card">
        <span>背景与圆角</span>

        <label class="toggle-line">
          <span>启用背景填充</span>
          <input id="backgroundEnabled" type="checkbox" ${backgroundEnabled ? "checked" : ""} />
        </label>

        <label class="field">
          <span>背景颜色</span>
          <input id="backgroundColor" type="color" value="${backgroundColor}" ${backgroundEnabled ? "" : "disabled"} />
        </label>

        <label class="field field-compact">
          <div class="range-label">
            <span>圆角半径</span>
            <strong class="quality-value">${Math.round(appearance.cornerRadius)}px</strong>
          </div>
          <input
            id="cornerRadiusRange"
            type="range"
            min="${APPEARANCE_LIMITS.cornerRadius.min}"
            max="${maxCornerRadius}"
            step="${APPEARANCE_LIMITS.cornerRadius.step}"
            value="${Math.min(appearance.cornerRadius, maxCornerRadius)}"
          />
        </label>
      </div>

      <div class="tool-section tool-card">
        <span>边框</span>

        <label class="toggle-line">
          <span>启用边框</span>
          <input id="borderEnabled" type="checkbox" ${borderEnabled ? "checked" : ""} />
        </label>

        <label class="field field-compact">
          <div class="range-label">
            <span>边框宽度</span>
            <strong class="quality-value">${Math.round(appearance.borderWidth)}px</strong>
          </div>
          <input
            id="borderWidthRange"
            type="range"
            min="${APPEARANCE_LIMITS.borderWidth.min}"
            max="${maxBorderWidth}"
            step="${APPEARANCE_LIMITS.borderWidth.step}"
            value="${Math.min(appearance.borderWidth, maxBorderWidth)}"
            ${borderEnabled ? "" : "disabled"}
          />
        </label>

        <label class="field">
          <span>边框颜色</span>
          <input id="borderColor" type="color" value="${appearance.borderColor}" ${borderEnabled ? "" : "disabled"} />
        </label>
      </div>

      <div class="button-row">
        <button id="resetAppearanceBtn" type="button">恢复默认外观</button>
      </div>

      <div class="tool-summary">
        <strong>当前外观</strong>
        ${getAppearanceSummary(appearance)}
      </div>
    `;

    root.querySelector("#backgroundEnabled").addEventListener("change", (event) => {
      actions.setAppearanceBackgroundEnabled(event.target.checked);
    });
    root.querySelector("#backgroundColor").addEventListener("input", (event) => {
      actions.setAppearanceBackgroundColor(event.target.value);
    });
    root.querySelector("#cornerRadiusRange").addEventListener("input", (event) => {
      actions.setAppearanceCornerRadius(event.target.value);
    });
    root.querySelector("#borderEnabled").addEventListener("change", (event) => {
      actions.setAppearanceBorderEnabled(event.target.checked);
    });
    root.querySelector("#borderWidthRange").addEventListener("input", (event) => {
      actions.setAppearanceBorderWidth(event.target.value);
    });
    root.querySelector("#borderColor").addEventListener("input", (event) => {
      actions.setAppearanceBorderColor(event.target.value);
    });
    root.querySelector("#resetAppearanceBtn").addEventListener("click", actions.resetAppearance);
  },
};
