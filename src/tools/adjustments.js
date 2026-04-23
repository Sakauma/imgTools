import {
  ADJUSTMENT_LIMITS,
  getAdjustmentSummary,
  normalizeAdjustments,
} from "../lib/adjustments.js";

const SECTION_OPTIONS = [
  { value: "basic", label: "基础" },
  { value: "color", label: "色彩" },
  { value: "detail", label: "细节" },
];

function renderSliderField({ id, label, min, max, step, value, valueLabel }) {
  return `
    <label class="field field-compact">
      <div class="range-label">
        <span>${label}</span>
        <strong class="quality-value">${valueLabel}</strong>
      </div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
    </label>
  `;
}

function formatSignedValue(value, suffix = "") {
  if (value > 0) {
    return `+${value}${suffix}`;
  }

  return `${value}${suffix}`;
}

function renderSectionContent(section, adjustments) {
  if (section === "color") {
    return `
      <div class="tool-section tool-card">
        <span>色彩偏移</span>
        ${renderSliderField({
          id: "temperatureRange",
          label: "色温（冷 / 暖）",
          value: adjustments.temperature,
          valueLabel: formatSignedValue(adjustments.temperature),
          ...ADJUSTMENT_LIMITS.temperature,
        })}
        ${renderSliderField({
          id: "tintRange",
          label: "色调（绿 / 品红）",
          value: adjustments.tint,
          valueLabel: formatSignedValue(adjustments.tint),
          ...ADJUSTMENT_LIMITS.tint,
        })}
        <div class="toggle-grid">
          <label class="toggle-line">
            <span>灰度</span>
            <input id="grayscaleToggle" type="checkbox" ${adjustments.grayscale ? "checked" : ""} />
          </label>
          <label class="toggle-line">
            <span>棕褐色</span>
            <input id="sepiaToggle" type="checkbox" ${adjustments.sepia ? "checked" : ""} />
          </label>
          <label class="toggle-line">
            <span>反相</span>
            <input id="invertToggle" type="checkbox" ${adjustments.invert ? "checked" : ""} />
          </label>
        </div>
      </div>
    `;
  }

  if (section === "detail") {
    return `
      <div class="tool-section tool-card">
        <span>细节处理</span>
        ${renderSliderField({
          id: "blurRange",
          label: "模糊",
          value: adjustments.blur,
          valueLabel: `${adjustments.blur.toFixed(1)}px`,
          ...ADJUSTMENT_LIMITS.blur,
        })}
        ${renderSliderField({
          id: "sharpenRange",
          label: "锐化",
          value: adjustments.sharpen,
          valueLabel: `${Math.round(adjustments.sharpen)}%`,
          ...ADJUSTMENT_LIMITS.sharpen,
        })}
      </div>
    `;
  }

  return `
    <div class="tool-section tool-card">
      <span>基础调整</span>
      ${renderSliderField({
        id: "brightnessRange",
        label: "亮度",
        value: adjustments.brightness,
        valueLabel: formatSignedValue(adjustments.brightness),
        ...ADJUSTMENT_LIMITS.brightness,
      })}
      ${renderSliderField({
        id: "contrastRange",
        label: "对比度",
        value: adjustments.contrast,
        valueLabel: formatSignedValue(adjustments.contrast),
        ...ADJUSTMENT_LIMITS.contrast,
      })}
      ${renderSliderField({
        id: "saturationRange",
        label: "饱和度",
        value: adjustments.saturation,
        valueLabel: formatSignedValue(adjustments.saturation),
        ...ADJUSTMENT_LIMITS.saturation,
      })}
    </div>
  `;
}

export const adjustmentsTool = {
  id: "adjustments",
  label: "调整",
  hint: "图像调整总是在旋转、裁剪和尺寸调整之后应用，并直接影响导出结果。",
  render(root, session, actions) {
    const adjustments = normalizeAdjustments(session.pipeline.adjustments);
    const activeSection = SECTION_OPTIONS.some((option) => option.value === session.ui.adjustmentSection)
      ? session.ui.adjustmentSection
      : "basic";
    session.ui.adjustmentSection = activeSection;

    root.innerHTML = `
      <div class="subtool-tabs" aria-label="调整分组">
        ${SECTION_OPTIONS.map(
          (option) => `
            <button class="subtool-tab${activeSection === option.value ? " is-active" : ""}" type="button" data-adjustment-section="${option.value}">
              ${option.label}
            </button>
          `
        ).join("")}
      </div>

      ${renderSectionContent(activeSection, adjustments)}

      <div class="button-row">
        <button id="resetAdjustmentsBtn" type="button">恢复默认调整</button>
      </div>

      <div class="tool-summary">
        <strong>当前调整</strong>
        ${getAdjustmentSummary(adjustments)}
      </div>
    `;

    root.querySelectorAll("[data-adjustment-section]").forEach((button) => {
      button.addEventListener("click", () => {
        session.ui.adjustmentSection = button.dataset.adjustmentSection;
        adjustmentsTool.render(root, session, actions);
      });
    });

    root.querySelector("#brightnessRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("brightness", event.target.value);
    });
    root.querySelector("#contrastRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("contrast", event.target.value);
    });
    root.querySelector("#saturationRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("saturation", event.target.value);
    });
    root.querySelector("#temperatureRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("temperature", event.target.value);
    });
    root.querySelector("#tintRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("tint", event.target.value);
    });
    root.querySelector("#blurRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("blur", event.target.value);
    });
    root.querySelector("#sharpenRange")?.addEventListener("input", (event) => {
      actions.setAdjustmentValue("sharpen", event.target.value);
    });
    root.querySelector("#grayscaleToggle")?.addEventListener("change", (event) => {
      actions.setAdjustmentToggle("grayscale", event.target.checked);
    });
    root.querySelector("#sepiaToggle")?.addEventListener("change", (event) => {
      actions.setAdjustmentToggle("sepia", event.target.checked);
    });
    root.querySelector("#invertToggle")?.addEventListener("change", (event) => {
      actions.setAdjustmentToggle("invert", event.target.checked);
    });
    root.querySelector("#resetAdjustmentsBtn").addEventListener("click", actions.resetAdjustments);
  },
};
