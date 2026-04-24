import { POSTER_PRESETS } from "../lib/presets.js";

export const presetsTool = {
  id: "presets",
  label: "预设",
  hint: "一键套用漫画海报、复印杂志和半调网点风格参数。",
  render(root, session, viewState, actions) {
    root.innerHTML = `
      <div class="preset-grid">
        ${POSTER_PRESETS.map((preset) => `
          <button class="preset-card" type="button" data-preset-id="${preset.id}">
            <strong>${preset.label}</strong>
            <span>${preset.description}</span>
          </button>
        `).join("")}
      </div>
      <div class="tool-summary">预设会调整“调整”和“效果”参数，不会删除已有文字或色块层。</div>
    `;
    root.querySelectorAll("[data-preset-id]").forEach((button) => {
      button.addEventListener("click", () => actions.applyPreset(button.dataset.presetId));
    });
  },
};
