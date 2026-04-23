const imageInput = document.querySelector("#imageInput");
const ratioPreset = document.querySelector("#ratioPreset");
const customRatioFields = document.querySelector("#customRatioFields");
const customWidthInput = document.querySelector("#customWidth");
const customHeightInput = document.querySelector("#customHeight");
const exportFormat = document.querySelector("#exportFormat");
const loadDemoBtn = document.querySelector("#loadDemo");
const resetCropBtn = document.querySelector("#resetCrop");
const centerCropBtn = document.querySelector("#centerCrop");
const downloadBtn = document.querySelector("#downloadBtn");
const emptyState = document.querySelector("#emptyState");
const viewport = document.querySelector("#viewport");
const stage = document.querySelector("#stage");
const imagePreview = document.querySelector("#imagePreview");
const cropBox = document.querySelector("#cropBox");
const resultCanvas = document.querySelector("#resultCanvas");
const imageMeta = document.querySelector("#imageMeta");
const cropMeta = document.querySelector("#cropMeta");
const ratioMeta = document.querySelector("#ratioMeta");

const MIN_CROP_SIZE = 48;
const state = {
  imageLoaded: false,
  naturalWidth: 0,
  naturalHeight: 0,
  stageWidth: 0,
  stageHeight: 0,
  crop: null,
  drag: null,
  dropDepth: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getActiveRatio() {
  if (ratioPreset.value === "free") {
    return null;
  }

  if (ratioPreset.value === "custom") {
    const width = Number(customWidthInput.value);
    const height = Number(customHeightInput.value);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return width / height;
  }

  const [width, height] = ratioPreset.value.split(":").map(Number);
  return width / height;
}

function getRatioLabel() {
  if (ratioPreset.value === "free") {
    return "自由裁剪";
  }

  if (ratioPreset.value === "custom") {
    return `${customWidthInput.value || "?"} : ${customHeightInput.value || "?"}`;
  }

  return ratioPreset.value.replace(":", " : ");
}

function syncRatioUi() {
  const isCustom = ratioPreset.value === "custom";
  customRatioFields.hidden = !isCustom;
  ratioMeta.textContent = getRatioLabel();
}

function fitStageToViewport() {
  if (!state.imageLoaded) {
    return;
  }

  const bounds = viewport.getBoundingClientRect();
  const maxWidth = Math.max(280, bounds.width - 40);
  const maxHeight = Math.max(260, window.innerHeight * 0.62);
  const imageRatio = state.naturalWidth / state.naturalHeight;

  let nextWidth = maxWidth;
  let nextHeight = nextWidth / imageRatio;

  if (nextHeight > maxHeight) {
    nextHeight = maxHeight;
    nextWidth = nextHeight * imageRatio;
  }

  const previousWidth = state.stageWidth;
  const previousHeight = state.stageHeight;

  state.stageWidth = Math.round(nextWidth);
  state.stageHeight = Math.round(nextHeight);

  stage.style.width = `${state.stageWidth}px`;
  stage.style.height = `${state.stageHeight}px`;

  if (state.crop && previousWidth > 0 && previousHeight > 0) {
    const scaleX = state.stageWidth / previousWidth;
    const scaleY = state.stageHeight / previousHeight;
    state.crop = {
      x: state.crop.x * scaleX,
      y: state.crop.y * scaleY,
      width: state.crop.width * scaleX,
      height: state.crop.height * scaleY,
    };
    ensureCropInBounds();
    renderCrop();
    renderResult();
  }
}

function createCenteredCrop(scale = 0.78) {
  const ratio = getActiveRatio();
  const maxWidth = state.stageWidth * scale;
  const maxHeight = state.stageHeight * scale;

  let width;
  let height;

  if (!ratio) {
    width = maxWidth;
    height = maxHeight;
  } else if (maxWidth / maxHeight > ratio) {
    height = maxHeight;
    width = height * ratio;
  } else {
    width = maxWidth;
    height = width / ratio;
  }

  width = clamp(width, MIN_CROP_SIZE, state.stageWidth);
  height = clamp(height, MIN_CROP_SIZE, state.stageHeight);

  return {
    x: (state.stageWidth - width) / 2,
    y: (state.stageHeight - height) / 2,
    width,
    height,
  };
}

function ensureCropInBounds() {
  if (!state.crop) {
    return;
  }

  const ratio = getActiveRatio();
  let { x, y, width, height } = state.crop;

  width = clamp(width, MIN_CROP_SIZE, state.stageWidth);
  height = clamp(height, MIN_CROP_SIZE, state.stageHeight);

  if (ratio) {
    width = Math.min(width, height * ratio);
    height = width / ratio;

    if (height > state.stageHeight) {
      height = state.stageHeight;
      width = height * ratio;
    }
  }

  x = clamp(x, 0, state.stageWidth - width);
  y = clamp(y, 0, state.stageHeight - height);

  state.crop = { x, y, width, height };
}

function applyRatioToCurrentCrop() {
  if (!state.crop) {
    state.crop = createCenteredCrop();
    renderCrop();
    renderResult();
    return;
  }

  const ratio = getActiveRatio();
  if (!ratio) {
    ensureCropInBounds();
    renderCrop();
    renderResult();
    return;
  }

  const centerX = state.crop.x + state.crop.width / 2;
  const centerY = state.crop.y + state.crop.height / 2;
  const maxWidth = Math.min(centerX, state.stageWidth - centerX) * 2;
  const maxHeight = Math.min(centerY, state.stageHeight - centerY) * 2;
  let width = Math.min(state.crop.width, maxWidth);
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  width = clamp(width, MIN_CROP_SIZE, state.stageWidth);
  height = clamp(height, MIN_CROP_SIZE, state.stageHeight);

  state.crop = {
    x: clamp(centerX - width / 2, 0, state.stageWidth - width),
    y: clamp(centerY - height / 2, 0, state.stageHeight - height),
    width,
    height,
  };

  renderCrop();
  renderResult();
}

function renderCrop() {
  if (!state.crop) {
    return;
  }

  cropBox.style.left = `${state.crop.x}px`;
  cropBox.style.top = `${state.crop.y}px`;
  cropBox.style.width = `${state.crop.width}px`;
  cropBox.style.height = `${state.crop.height}px`;

  const scaleX = state.naturalWidth / state.stageWidth;
  const scaleY = state.naturalHeight / state.stageHeight;
  const width = Math.round(state.crop.width * scaleX);
  const height = Math.round(state.crop.height * scaleY);

  cropMeta.textContent = `${width} × ${height}px`;
  ratioMeta.textContent = getRatioLabel();
}

function renderResult() {
  if (!state.crop || !state.imageLoaded) {
    return;
  }

  const sourceX = Math.round((state.crop.x / state.stageWidth) * state.naturalWidth);
  const sourceY = Math.round((state.crop.y / state.stageHeight) * state.naturalHeight);
  const sourceWidth = Math.round((state.crop.width / state.stageWidth) * state.naturalWidth);
  const sourceHeight = Math.round((state.crop.height / state.stageHeight) * state.naturalHeight);
  const previewLimit = 420;
  const previewScale = Math.min(previewLimit / sourceWidth, previewLimit / sourceHeight, 1);

  resultCanvas.width = Math.max(1, Math.round(sourceWidth * previewScale));
  resultCanvas.height = Math.max(1, Math.round(sourceHeight * previewScale));

  const context = resultCanvas.getContext("2d");
  context.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  context.drawImage(
    imagePreview,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    resultCanvas.width,
    resultCanvas.height
  );
}

function buildExportCanvas() {
  const canvas = document.createElement("canvas");
  const sourceX = Math.round((state.crop.x / state.stageWidth) * state.naturalWidth);
  const sourceY = Math.round((state.crop.y / state.stageHeight) * state.naturalHeight);
  const sourceWidth = Math.round((state.crop.width / state.stageWidth) * state.naturalWidth);
  const sourceHeight = Math.round((state.crop.height / state.stageHeight) * state.naturalHeight);
  const context = canvas.getContext("2d");

  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  context.drawImage(
    imagePreview,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );

  return canvas;
}

function getStagePoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return {
    x: clamp(clientX - rect.left, 0, rect.width),
    y: clamp(clientY - rect.top, 0, rect.height),
  };
}

function setCrop(nextCrop) {
  state.crop = nextCrop;
  ensureCropInBounds();
  renderCrop();
  renderResult();
}

function centerCurrentCrop() {
  if (!state.crop) {
    return;
  }

  setCrop({
    ...state.crop,
    x: (state.stageWidth - state.crop.width) / 2,
    y: (state.stageHeight - state.crop.height) / 2,
  });
}

function moveCrop(clientX, clientY) {
  const point = getStagePoint(clientX, clientY);
  const offsetX = state.drag.offsetX;
  const offsetY = state.drag.offsetY;
  const x = clamp(point.x - offsetX, 0, state.stageWidth - state.crop.width);
  const y = clamp(point.y - offsetY, 0, state.stageHeight - state.crop.height);
  setCrop({ ...state.crop, x, y });
}

function resizeFreeform(handle, clientX, clientY) {
  const point = getStagePoint(clientX, clientY);
  const original = state.drag.origin;
  let left = original.x;
  let top = original.y;
  let right = original.x + original.width;
  let bottom = original.y + original.height;

  if (handle.includes("w")) {
    left = clamp(point.x, 0, right - MIN_CROP_SIZE);
  }

  if (handle.includes("e")) {
    right = clamp(point.x, left + MIN_CROP_SIZE, state.stageWidth);
  }

  if (handle.includes("n")) {
    top = clamp(point.y, 0, bottom - MIN_CROP_SIZE);
  }

  if (handle.includes("s")) {
    bottom = clamp(point.y, top + MIN_CROP_SIZE, state.stageHeight);
  }

  setCrop({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
}

function resizeLockedRatio(handle, clientX, clientY) {
  const point = getStagePoint(clientX, clientY);
  const ratio = getActiveRatio();
  const original = state.drag.origin;

  let anchorX = original.x;
  let anchorY = original.y;
  let horizontal = 1;
  let vertical = 1;

  switch (handle) {
    case "nw":
      anchorX = original.x + original.width;
      anchorY = original.y + original.height;
      horizontal = -1;
      vertical = -1;
      break;
    case "ne":
      anchorX = original.x;
      anchorY = original.y + original.height;
      horizontal = 1;
      vertical = -1;
      break;
    case "sw":
      anchorX = original.x + original.width;
      anchorY = original.y;
      horizontal = -1;
      vertical = 1;
      break;
    case "se":
      anchorX = original.x;
      anchorY = original.y;
      horizontal = 1;
      vertical = 1;
      break;
  }

  const rawWidth = Math.abs(point.x - anchorX);
  const rawHeight = Math.abs(point.y - anchorY);
  const desiredWidth = Math.max(MIN_CROP_SIZE, Math.min(rawWidth, rawHeight * ratio));
  const maxWidthByBounds =
    horizontal < 0 ? anchorX : state.stageWidth - anchorX;
  const maxHeightByBounds =
    vertical < 0 ? anchorY : state.stageHeight - anchorY;
  const maxWidth = Math.min(maxWidthByBounds, maxHeightByBounds * ratio);
  const width = clamp(desiredWidth, MIN_CROP_SIZE, maxWidth);
  const height = width / ratio;

  const x = horizontal < 0 ? anchorX - width : anchorX;
  const y = vertical < 0 ? anchorY - height : anchorY;

  setCrop({ x, y, width, height });
}

function beginDrag(event) {
  if (!state.crop || !state.imageLoaded) {
    return;
  }

  const handle = event.target.dataset.handle;
  const point = getStagePoint(event.clientX, event.clientY);

  if (handle) {
    state.drag = {
      type: "resize",
      handle,
      origin: { ...state.crop },
    };
  } else if (event.target === cropBox || cropBox.contains(event.target)) {
    state.drag = {
      type: "move",
      offsetX: point.x - state.crop.x,
      offsetY: point.y - state.crop.y,
      origin: { ...state.crop },
    };
  } else {
    return;
  }

  cropBox.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function onPointerMove(event) {
  if (!state.drag) {
    return;
  }

  if (state.drag.type === "move") {
    moveCrop(event.clientX, event.clientY);
    return;
  }

  if (getActiveRatio()) {
    resizeLockedRatio(state.drag.handle, event.clientX, event.clientY);
  } else {
    resizeFreeform(state.drag.handle, event.clientX, event.clientY);
  }
}

function finishDrag(event) {
  if (!state.drag) {
    return;
  }

  if (cropBox.hasPointerCapture(event.pointerId)) {
    cropBox.releasePointerCapture(event.pointerId);
  }

  state.drag = null;
}

function initializeCrop() {
  state.crop = createCenteredCrop();
  renderCrop();
  renderResult();
}

function finalizeImageLoad() {
  state.imageLoaded = true;
  state.naturalWidth = imagePreview.naturalWidth;
  state.naturalHeight = imagePreview.naturalHeight;
  imageMeta.textContent = `${state.naturalWidth} × ${state.naturalHeight}px`;
  emptyState.hidden = true;
  stage.hidden = false;
  downloadBtn.disabled = false;
  fitStageToViewport();
  initializeCrop();
}

function loadImageSource(source) {
  imagePreview.onload = finalizeImageLoad;
  imagePreview.src = source;
}

function loadSelectedImage(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => loadImageSource(reader.result);
  reader.readAsDataURL(file);
}

function downloadCroppedImage() {
  if (!state.crop || !state.imageLoaded) {
    return;
  }

  const canvas = buildExportCanvas();
  const link = document.createElement("a");
  const extension = exportFormat.value === "image/jpeg" ? "jpg" : "png";

  link.href = canvas.toDataURL(exportFormat.value, 0.92);
  link.download = `cropped-image.${extension}`;
  link.click();
}

function handleFileDrop(event) {
  event.preventDefault();
  state.dropDepth = 0;
  viewport.classList.remove("drag-over");

  const file = [...(event.dataTransfer?.files || [])].find((item) =>
    item.type.startsWith("image/")
  );

  if (!file) {
    return;
  }

  loadSelectedImage(file);
}

imageInput.addEventListener("change", (event) => {
  loadSelectedImage(event.target.files?.[0]);
});

ratioPreset.addEventListener("change", () => {
  syncRatioUi();
  if (state.imageLoaded) {
    applyRatioToCurrentCrop();
  }
});

customWidthInput.addEventListener("input", () => {
  if (ratioPreset.value !== "custom") {
    return;
  }

  syncRatioUi();
  if (state.imageLoaded) {
    applyRatioToCurrentCrop();
  }
});

customHeightInput.addEventListener("input", () => {
  if (ratioPreset.value !== "custom") {
    return;
  }

  syncRatioUi();
  if (state.imageLoaded) {
    applyRatioToCurrentCrop();
  }
});

resetCropBtn.addEventListener("click", () => {
  if (!state.imageLoaded) {
    return;
  }

  initializeCrop();
});

centerCropBtn.addEventListener("click", () => {
  if (!state.imageLoaded || !state.crop) {
    return;
  }

  centerCurrentCrop();
});

loadDemoBtn.addEventListener("click", () => {
  loadImageSource("./demo.svg");
});

downloadBtn.addEventListener("click", downloadCroppedImage);
cropBox.addEventListener("pointerdown", beginDrag);
viewport.addEventListener("dragenter", (event) => {
  event.preventDefault();
  state.dropDepth += 1;
  viewport.classList.add("drag-over");
});
viewport.addEventListener("dragover", (event) => {
  event.preventDefault();
  viewport.classList.add("drag-over");
});
viewport.addEventListener("dragleave", (event) => {
  state.dropDepth = Math.max(0, state.dropDepth - 1);
  if (state.dropDepth === 0) {
    viewport.classList.remove("drag-over");
  }
});
viewport.addEventListener("drop", handleFileDrop);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", finishDrag);
window.addEventListener("pointercancel", finishDrag);
window.addEventListener("resize", () => {
  if (!state.imageLoaded) {
    return;
  }

  fitStageToViewport();
});

syncRatioUi();
loadImageSource("./demo.svg");
