import { EFFECT_LIMITS, getEffectsSummary, normalizeEffects } from "../lib/effects.js";
import { bindCheckbox, bindClick, bindRange } from "./bindings.js";

function slider(id, label, value, limits) {
  return `
    <label class="field field-compact">
      <div class="range-label"><span>${label}</span><strong class="quality-value">${Math.round(value)}%</strong></div>
      <input id="${id}" type="range" min="${limits.min}" max="${limits.max}" step="${limits.step}" value="${value}" />
    </label>
  `;
}

export const effectsTool = {
  id: "effects",
  label: "效果",
  hint: "扫描漫画底图处理：灰度、阈值、纸张提亮、线稿淡化、颗粒和半调网点。",
  render(root, session, viewState, actions) {
    const effects = normalizeEffects(session.pipeline.effects);
    root.innerHTML = `
      <div class="tool-section tool-card">
        <span>扫描底图</span>
        <label class="toggle-line"><span>灰度漫画底图</span><input id="effectGrayscale" type="checkbox" ${effects.grayscale ? "checked" : ""} /></label>
        ${slider("effectThreshold", "阈值化", effects.threshold, EFFECT_LIMITS.threshold)}
        ${slider("effectPaperLift", "纸张提亮", effects.paperLift, EFFECT_LIMITS.paperLift)}
        ${slider("effectLineFade", "线稿淡化", effects.lineFade, EFFECT_LIMITS.lineFade)}
      </div>
      <div class="tool-section tool-card">
        <span>复印质感</span>
        ${slider("effectGrain", "颗粒噪声", effects.grain, EFFECT_LIMITS.grain)}
        ${slider("effectPaperTexture", "纸纹", effects.paperTexture, EFFECT_LIMITS.paperTexture)}
        ${slider("effectHalftone", "半调网点", effects.halftone, EFFECT_LIMITS.halftone)}
      </div>
      <div class="button-row">
        <button id="resetEffects" type="button">重置效果</button>
      </div>
      <div class="tool-summary">${getEffectsSummary(effects)}</div>
    `;

    bindCheckbox(root, "#effectGrayscale", (enabled) => actions.setEffectToggle("grayscale", enabled));
    [
      ["#effectThreshold", "threshold"],
      ["#effectPaperLift", "paperLift"],
      ["#effectLineFade", "lineFade"],
      ["#effectGrain", "grain"],
      ["#effectPaperTexture", "paperTexture"],
      ["#effectHalftone", "halftone"],
    ].forEach(([selector, key]) => {
      bindRange(root, selector, (value) => actions.setEffectValue(key, value));
    });
    bindClick(root, "#resetEffects", actions.resetEffects);
  },
};
