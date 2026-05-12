import { BLEND_MODES, normalizeLayers } from "../lib/layers.js";
import { escapeHtml } from "../lib/html.js";
import { bindClick, bindRange, bindSelect } from "./bindings.js";

function layerTitle(layer) {
  if (layer.type === "text") {
    return layer.text || "文字层";
  }
  if (layer.type === "shape") {
    return "色块层";
  }
  return "绘画层";
}

function layerKind(layer) {
  if (layer.type === "text") return "文字";
  if (layer.type === "shape") return "形状";
  return `${layer.strokes.length} 笔`;
}

function selectedLayer(session, viewState) {
  const layers = normalizeLayers(session.pipeline.layers);
  return layers.find((layer) => layer.id === viewState.selectedLayerId) ?? layers.at(-1) ?? null;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

export const layersTool = {
  id: "layers",
  label: "图层",
  hint: "集中管理文字、形状和绘画层，可调整顺序、显隐、透明度和混合模式。",
  render(root, session, viewState, actions) {
    const layers = normalizeLayers(session.pipeline.layers).toReversed();
    const layer = selectedLayer(session, viewState);
    if (layer && viewState.selectedLayerId !== layer.id) {
      viewState.selectedLayerId = layer.id;
    }

    root.innerHTML = `
      <div class="layer-list layer-stack">
        ${layers.map((item) => `
          <button type="button" class="layer-row${item.id === layer?.id ? " is-active" : ""}" data-layer-id="${item.id}">
            <span>${item.visible ? "●" : "○"} ${escapeHtml(layerTitle(item))}</span>
            <strong>${layerKind(item)} · ${Math.round(item.opacity)}%</strong>
          </button>
        `).join("") || `<p class="muted-copy">还没有图层。可以用画笔、文字或形状工具创建。</p>`}
      </div>

      ${layer ? `
        <div class="button-row">
          <button id="toggleLayerVisible" type="button">${layer.visible ? "隐藏图层" : "显示图层"}</button>
          <button id="duplicateLayer" type="button">复制图层</button>
          <button id="moveLayerUp" type="button">上移</button>
          <button id="moveLayerDown" type="button">下移</button>
        </div>

        <div class="field-group two-col">
          <label class="field field-compact"><span>混合模式</span><select id="layerBlend">${BLEND_MODES.map((mode) => option(mode, mode, layer.blendMode)).join("")}</select></label>
          <label class="field field-compact"><span>透明度 ${Math.round(layer.opacity)}%</span><input id="layerOpacity" type="range" min="0" max="100" value="${layer.opacity}" /></label>
        </div>

        ${layer.type !== "paint" ? `
          <div class="tool-layout-grid">
            <label class="field field-compact"><span>X ${Math.round(layer.x)}%</span><input id="layerX" type="range" min="0" max="100" value="${layer.x}" /></label>
            <label class="field field-compact"><span>Y ${Math.round(layer.y)}%</span><input id="layerY" type="range" min="0" max="100" value="${layer.y}" /></label>
            <label class="field field-compact"><span>旋转 ${Math.round(layer.rotation)}°</span><input id="layerRotation" type="range" min="-180" max="180" value="${layer.rotation}" /></label>
          </div>
        ` : ""}

        <button id="deleteLayer" type="button">删除当前图层</button>
      ` : ""}

      <div class="tool-summary">${layers.length} 个图层 · 顶部图层优先显示</div>
    `;

    root.querySelectorAll("[data-layer-id]").forEach((button) => {
      button.addEventListener("click", () => actions.selectLayer(button.dataset.layerId));
    });
    if (!layer) return;
    const update = (patch) => actions.updateLayer(layer.id, patch);
    bindClick(root, "#toggleLayerVisible", () => actions.toggleLayerVisible(layer.id));
    bindClick(root, "#duplicateLayer", () => actions.duplicateLayer(layer.id));
    bindClick(root, "#moveLayerUp", () => actions.moveLayer(layer.id, "up"));
    bindClick(root, "#moveLayerDown", () => actions.moveLayer(layer.id, "down"));
    bindClick(root, "#deleteLayer", () => actions.deleteLayer(layer.id));
    bindSelect(root, "#layerBlend", (blendMode) => update({ blendMode }));
    bindRange(root, "#layerOpacity", (opacity) => update({ opacity }));
    bindRange(root, "#layerX", (x) => update({ x }));
    bindRange(root, "#layerY", (y) => update({ y }));
    bindRange(root, "#layerRotation", (rotation) => update({ rotation }));
  },
};
