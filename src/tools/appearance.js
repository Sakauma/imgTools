import {
  APPEARANCE_LIMITS,
  getAppearanceSummary,
  normalizeAppearance,
} from "../lib/appearance.js";
import {
  EXPAND_ASPECT_OPTIONS,
  getExpandSummary,
  normalizeExpand,
} from "../lib/expand.js";

export const appearanceTool = {
  id: "appearance",
  label: "外观",
  hint: "扩边只扩展画布不缩放图像；背景、圆角和边框都基于最终输出画布生效。",
  render(root, session, viewState, actions, derived) {
    const appearance = normalizeAppearance(session.pipeline.appearance);
    const expand = normalizeExpand(session.pipeline.expand);
    const minSide = Math.max(1, Math.min(derived.outputSize.width, derived.outputSize.height));
    const maxCornerRadius = Math.max(1, Math.min(Math.floor(minSide / 2), APPEARANCE_LIMITS.cornerRadius.max));
    const maxBorderWidth = Math.max(1, Math.min(Math.floor(minSide / 4), APPEARANCE_LIMITS.borderWidth.max));
    const backgroundColor = appearance.backgroundColor ?? "#f8fafc";
    const backgroundEnabled = Boolean(appearance.backgroundColor);
    const borderEnabled = appearance.borderWidth > 0;
    const customExpand = expand.aspectMode === "custom";
    const summary = [getExpandSummary(derived.contentSize, expand), getAppearanceSummary(appearance)]
      .filter((entry) => entry !== "未扩边" && entry !== "默认")
      .join(" · ");

    root.innerHTML = `
      <div class="tool-section tool-card">
        <span>扩边</span>

        <label class="toggle-line">
          <span>启用目标比例扩边</span>
          <input id="expandEnabled" type="checkbox" ${expand.enabled ? "checked" : ""} />
        </label>

        <div class="ratio-row">
          ${EXPAND_ASPECT_OPTIONS.map(
            (option) => `
              <button class="ratio-chip${expand.aspectMode === option.value ? " is-active" : ""}" type="button" data-expand-mode="${option.value}">
                ${option.label}
              </button>
            `
          ).join("")}
        </div>

        ${
          customExpand
            ? `
              <div class="field-group two-col">
                <label class="field">
                  <span>自定义宽</span>
                  <input id="expandCustomWidth" type="number" min="1" step="1" value="${expand.customAspect.width}" />
                </label>
                <label class="field">
                  <span>自定义高</span>
                  <input id="expandCustomHeight" type="number" min="1" step="1" value="${expand.customAspect.height}" />
                </label>
              </div>
            `
            : ""
        }

        <div class="tool-note">
          <span>当前输出尺寸</span>
          <strong>${derived.outputSize.width} × ${derived.outputSize.height}px</strong>
        </div>
      </div>

      <div class="tool-layout-grid">
        <div class="tool-section tool-card">
          <span>背景</span>

          <label class="toggle-line">
            <span>启用背景填充</span>
            <input id="backgroundEnabled" type="checkbox" ${backgroundEnabled ? "checked" : ""} />
          </label>

          <label class="field">
            <span>背景颜色</span>
            <input id="backgroundColor" type="color" value="${backgroundColor}" ${backgroundEnabled ? "" : "disabled"} />
          </label>
        </div>

        <div class="tool-section tool-card">
          <span>圆角</span>

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
        <button id="resetExpandBtn" type="button">恢复默认扩边</button>
        <button id="resetAppearanceBtn" type="button">恢复默认外观</button>
      </div>

      <div class="tool-summary">
        <strong>当前外观</strong>
        ${summary || "默认"}
      </div>
    `;

    root.querySelector("#expandEnabled").addEventListener("change", (event) => {
      actions.setExpandEnabled(event.target.checked);
    });
    root.querySelectorAll("[data-expand-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        actions.setExpandAspectMode(button.dataset.expandMode);
      });
    });
    root.querySelector("#expandCustomWidth")?.addEventListener("input", (event) => {
      actions.setExpandCustomAspectWidth(event.target.value);
    });
    root.querySelector("#expandCustomHeight")?.addEventListener("input", (event) => {
      actions.setExpandCustomAspectHeight(event.target.value);
    });
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
    root.querySelector("#resetExpandBtn").addEventListener("click", actions.resetExpand);
    root.querySelector("#resetAppearanceBtn").addEventListener("click", actions.resetAppearance);
  },
};
