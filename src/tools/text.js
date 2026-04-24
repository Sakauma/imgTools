import { BLEND_MODES, normalizeLayers } from "../lib/layers.js";
import { escapeAttribute, escapeHtml } from "../lib/html.js";
import { bindCheckbox, bindClick, bindInput, bindRange, bindSelect } from "./bindings.js";

function textLayers(session) {
  return normalizeLayers(session.pipeline.layers).filter((layer) => layer.type === "text");
}

function selectedTextLayer(session, viewState) {
  const layers = textLayers(session);
  return layers.find((layer) => layer.id === viewState.selectedLayerId) ?? layers[0] ?? null;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

export const textTool = {
  id: "text",
  label: "文字",
  hint: "添加可旋转的文字层，用于海报标题、竖向大字和底部符号排版。",
  render(root, session, viewState, actions) {
    const layers = textLayers(session);
    const layer = selectedTextLayer(session, viewState);
    if (layer && viewState.selectedLayerId !== layer.id) {
      viewState.selectedLayerId = layer.id;
    }

    root.innerHTML = `
      <div class="button-row">
        <button id="addTextLayer" type="button" class="primary-button">添加文字层</button>
        <button id="deleteTextLayer" type="button" ${layer ? "" : "disabled"}>删除当前层</button>
      </div>
      <div class="layer-list">
        ${layers.map((item) => `
          <button type="button" class="layer-row${item.id === layer?.id ? " is-active" : ""}" data-layer-id="${item.id}">
            <span>${escapeHtml(item.text || "文字层")}</span>
            <strong>${Math.round(item.rotation)}°</strong>
          </button>
        `).join("") || `<p class="muted-copy">还没有文字层。添加一个竖排标题开始排版。</p>`}
      </div>
      ${layer ? `
        <div class="tool-section tool-card">
          <span>内容</span>
          <textarea id="textValue" rows="3">${escapeHtml(layer.text)}</textarea>
          <label class="field field-compact"><span>字体</span><input id="fontFamily" value="${escapeAttribute(layer.fontFamily)}" /></label>
          <div class="field-group two-col">
            <label class="field field-compact"><span>颜色</span><input id="textColor" type="color" value="${layer.color}" /></label>
            <label class="field field-compact"><span>混合</span><select id="textBlend">${BLEND_MODES.map((mode) => option(mode, mode, layer.blendMode)).join("")}</select></label>
          </div>
        </div>
        <div class="tool-layout-grid">
          <label class="field field-compact"><span>字号 ${Math.round(layer.fontSize)}px</span><input id="fontSize" type="range" min="8" max="220" value="${layer.fontSize}" /></label>
          <label class="field field-compact"><span>旋转 ${Math.round(layer.rotation)}°</span><input id="textRotation" type="range" min="-180" max="180" value="${layer.rotation}" /></label>
          <label class="field field-compact"><span>X ${Math.round(layer.x)}%</span><input id="textX" type="range" min="0" max="100" value="${layer.x}" /></label>
          <label class="field field-compact"><span>Y ${Math.round(layer.y)}%</span><input id="textY" type="range" min="0" max="100" value="${layer.y}" /></label>
          <label class="field field-compact"><span>透明度 ${Math.round(layer.opacity)}%</span><input id="textOpacity" type="range" min="0" max="100" value="${layer.opacity}" /></label>
          <label class="toggle-line"><span>斜体</span><input id="textItalic" type="checkbox" ${layer.italic ? "checked" : ""} /></label>
        </div>
      ` : ""}
      <div class="tool-summary">${layers.length} 个文字层 · 竖向效果可用旋转 -90° 实现</div>
    `;

    bindClick(root, "#addTextLayer", actions.addTextLayer);
    bindClick(root, "#deleteTextLayer", () => actions.deleteLayer(layer.id));
    root.querySelectorAll("[data-layer-id]").forEach((button) => {
      button.addEventListener("click", () => actions.selectLayer(button.dataset.layerId));
    });
    if (!layer) return;
    const update = (patch) => actions.updateLayer(layer.id, patch);
    bindInput(root, "#textValue", (text) => update({ text }));
    bindInput(root, "#fontFamily", (fontFamily) => update({ fontFamily }));
    bindInput(root, "#textColor", (color) => update({ color }));
    bindSelect(root, "#textBlend", (blendMode) => update({ blendMode }));
    bindRange(root, "#fontSize", (fontSize) => update({ fontSize }));
    bindRange(root, "#textRotation", (rotation) => update({ rotation }));
    bindRange(root, "#textX", (x) => update({ x }));
    bindRange(root, "#textY", (y) => update({ y }));
    bindRange(root, "#textOpacity", (opacity) => update({ opacity }));
    bindCheckbox(root, "#textItalic", (italic) => update({ italic }));
  },
};
