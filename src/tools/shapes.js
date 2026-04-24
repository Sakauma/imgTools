import { BLEND_MODES, normalizeLayers } from "../lib/layers.js";

function shapeLayers(session) {
  return normalizeLayers(session.pipeline.layers).filter((layer) => layer.type === "shape");
}

function selectedShapeLayer(session, viewState) {
  const layers = shapeLayers(session);
  return layers.find((layer) => layer.id === viewState.selectedLayerId) ?? layers[0] ?? null;
}

export const shapesTool = {
  id: "shapes",
  label: "形状",
  hint: "添加可旋转的矩形色块，用于红黑贴纸、蓝色色块和局部视觉标记。",
  render(root, session, viewState, actions) {
    const layers = shapeLayers(session);
    const layer = selectedShapeLayer(session, viewState);
    if (layer && viewState.selectedLayerId !== layer.id) {
      viewState.selectedLayerId = layer.id;
    }

    root.innerHTML = `
      <div class="button-row">
        <button id="addShapeLayer" type="button" class="primary-button">添加色块</button>
        <button id="deleteShapeLayer" type="button" ${layer ? "" : "disabled"}>删除当前层</button>
      </div>
      <div class="layer-list">
        ${layers.map((item) => `
          <button type="button" class="layer-row${item.id === layer?.id ? " is-active" : ""}" data-layer-id="${item.id}">
            <span style="background:${item.fillColor}"></span>
            <strong>${Math.round(item.rotation)}° · ${item.blendMode}</strong>
          </button>
        `).join("") || `<p class="muted-copy">还没有色块层。添加一个红色矩形开始叠加。</p>`}
      </div>
      ${layer ? `
        <div class="tool-layout-grid">
          <label class="field field-compact"><span>填充</span><input id="shapeFill" type="color" value="${layer.fillColor}" /></label>
          <label class="field field-compact"><span>描边</span><input id="shapeStroke" type="color" value="${layer.strokeColor}" /></label>
          <label class="field field-compact"><span>混合</span><select id="shapeBlend">${BLEND_MODES.map((mode) => `<option value="${mode}" ${mode === layer.blendMode ? "selected" : ""}>${mode}</option>`).join("")}</select></label>
          <label class="field field-compact"><span>描边 ${Math.round(layer.strokeWidth)}px</span><input id="shapeStrokeWidth" type="range" min="0" max="48" value="${layer.strokeWidth}" /></label>
          <label class="field field-compact"><span>X ${Math.round(layer.x)}%</span><input id="shapeX" type="range" min="0" max="100" value="${layer.x}" /></label>
          <label class="field field-compact"><span>Y ${Math.round(layer.y)}%</span><input id="shapeY" type="range" min="0" max="100" value="${layer.y}" /></label>
          <label class="field field-compact"><span>宽 ${Math.round(layer.width)}%</span><input id="shapeWidth" type="range" min="4" max="100" value="${layer.width}" /></label>
          <label class="field field-compact"><span>高 ${Math.round(layer.height)}%</span><input id="shapeHeight" type="range" min="4" max="100" value="${layer.height}" /></label>
          <label class="field field-compact"><span>旋转 ${Math.round(layer.rotation)}°</span><input id="shapeRotation" type="range" min="-180" max="180" value="${layer.rotation}" /></label>
          <label class="field field-compact"><span>透明度 ${Math.round(layer.opacity)}%</span><input id="shapeOpacity" type="range" min="0" max="100" value="${layer.opacity}" /></label>
        </div>
      ` : ""}
      <div class="tool-summary">${layers.length} 个色块层 · 支持 multiply / overlay 等混合模式</div>
    `;

    root.querySelector("#addShapeLayer").addEventListener("click", actions.addShapeLayer);
    root.querySelector("#deleteShapeLayer")?.addEventListener("click", () => actions.deleteLayer(layer.id));
    root.querySelectorAll("[data-layer-id]").forEach((button) => {
      button.addEventListener("click", () => actions.selectLayer(button.dataset.layerId));
    });
    if (!layer) return;
    const update = (patch) => actions.updateLayer(layer.id, patch);
    root.querySelector("#shapeFill").addEventListener("input", (event) => update({ fillColor: event.target.value }));
    root.querySelector("#shapeStroke").addEventListener("input", (event) => update({ strokeColor: event.target.value }));
    root.querySelector("#shapeBlend").addEventListener("change", (event) => update({ blendMode: event.target.value }));
    root.querySelector("#shapeStrokeWidth").addEventListener("input", (event) => update({ strokeWidth: Number(event.target.value) }));
    root.querySelector("#shapeX").addEventListener("input", (event) => update({ x: Number(event.target.value) }));
    root.querySelector("#shapeY").addEventListener("input", (event) => update({ y: Number(event.target.value) }));
    root.querySelector("#shapeWidth").addEventListener("input", (event) => update({ width: Number(event.target.value) }));
    root.querySelector("#shapeHeight").addEventListener("input", (event) => update({ height: Number(event.target.value) }));
    root.querySelector("#shapeRotation").addEventListener("input", (event) => update({ rotation: Number(event.target.value) }));
    root.querySelector("#shapeOpacity").addEventListener("input", (event) => update({ opacity: Number(event.target.value) }));
  },
};
