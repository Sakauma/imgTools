import { BLEND_MODES } from "../lib/layers.js";
import { getLayersByType, getSelectedLayer, syncSelectedLayer } from "../lib/layer-selection.js";
import { bindClick, bindInput, bindRange, bindSelect } from "./bindings.js";

function paintLayers(session) {
  return getLayersByType(session.pipeline.layers, "paint");
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

export const brushTool = {
  id: "brush",
  label: "画笔",
  hint: "在输出预览上自由绘制，切换橡皮可擦除当前绘画层的笔触。",
  render(root, session, viewState, actions) {
    const layers = paintLayers(session);
    const layer = syncSelectedLayer(
      viewState,
      getSelectedLayer(layers, viewState.selectedLayerId, { fallback: "first" })
    );

    root.innerHTML = `
      <div class="button-row">
        <button id="addPaintLayer" type="button" class="primary-button">添加绘画层</button>
        <button id="deletePaintLayer" type="button" ${layer ? "" : "disabled"}>删除当前层</button>
      </div>

      <div class="field-group two-col">
        <label class="field field-compact">
          <span>模式</span>
          <select id="brushMode">
            ${option("paint", "画笔", viewState.brush.mode)}
            ${option("erase", "橡皮", viewState.brush.mode)}
          </select>
        </label>
        <label class="field field-compact"><span>颜色</span><input id="brushColor" type="color" value="${viewState.brush.color}" /></label>
      </div>

      <div class="tool-layout-grid">
        <label class="field field-compact"><span>笔刷 ${Math.round(viewState.brush.size)}px</span><input id="brushSize" type="range" min="1" max="180" value="${viewState.brush.size}" /></label>
        <label class="field field-compact"><span>不透明度 ${Math.round(viewState.brush.opacity)}%</span><input id="brushOpacity" type="range" min="1" max="100" value="${viewState.brush.opacity}" /></label>
      </div>

      <div class="layer-list">
        ${layers.map((item) => `
          <button type="button" class="layer-row${item.id === layer?.id ? " is-active" : ""}" data-layer-id="${item.id}">
            <span>${item.strokes.length} 笔</span>
            <strong>${item.blendMode} · ${Math.round(item.opacity)}%</strong>
          </button>
        `).join("") || `<p class="muted-copy">还没有绘画层。添加后可直接在画布上绘制。</p>`}
      </div>

      ${layer ? `
        <div class="field-group two-col">
          <label class="field field-compact"><span>图层混合</span><select id="paintBlend">${BLEND_MODES.map((mode) => option(mode, mode, layer.blendMode)).join("")}</select></label>
          <label class="field field-compact"><span>图层透明 ${Math.round(layer.opacity)}%</span><input id="paintOpacity" type="range" min="0" max="100" value="${layer.opacity}" /></label>
        </div>
        <div class="button-row">
          <button id="undoPaintStroke" type="button" ${layer.strokes.length ? "" : "disabled"}>撤销一笔</button>
          <button id="clearPaintLayer" type="button" ${layer.strokes.length ? "" : "disabled"}>清空绘画层</button>
        </div>
      ` : ""}

      <div class="tool-summary">${layers.length} 个绘画层 · ${layer?.strokes.length ?? 0} 个笔触</div>
    `;

    bindClick(root, "#addPaintLayer", actions.addPaintLayer);
    bindClick(root, "#deletePaintLayer", () => actions.deleteLayer(layer.id));
    bindClick(root, "#undoPaintStroke", () => actions.removeLastPaintStroke(layer.id));
    bindClick(root, "#clearPaintLayer", () => actions.clearPaintLayer(layer.id));
    bindSelect(root, "#brushMode", actions.setBrushMode);
    bindInput(root, "#brushColor", actions.setBrushColor);
    bindRange(root, "#brushSize", actions.setBrushSize);
    bindRange(root, "#brushOpacity", actions.setBrushOpacity);
    root.querySelectorAll("[data-layer-id]").forEach((button) => {
      button.addEventListener("click", () => actions.selectLayer(button.dataset.layerId));
    });
    if (!layer) return;
    const update = (patch) => actions.updateLayer(layer.id, patch);
    bindSelect(root, "#paintBlend", (blendMode) => update({ blendMode }));
    bindRange(root, "#paintOpacity", (opacity) => update({ opacity }));
  },
};
