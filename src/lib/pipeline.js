import { fitInsideBox, getDisplayCropRect, getOrientedSize, getPixelCropRect } from "./geometry.js";
import { getOutputSize } from "./export.js";

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getOrientedCanvas(session) {
  if (!session.source) {
    return null;
  }

  const key = [
    session.source.token,
    session.transforms.rotateQuarterTurns,
    session.transforms.flipX,
    session.transforms.flipY,
  ].join(":");

  if (session.cache.orientedKey === key && session.cache.orientedCanvas) {
    return session.cache.orientedCanvas;
  }

  const { image, width: sourceWidth, height: sourceHeight } = session.source;
  const orientedSize = getOrientedSize(
    sourceWidth,
    sourceHeight,
    session.transforms.rotateQuarterTurns
  );
  const canvas = createCanvas(orientedSize.width, orientedSize.height);
  const context = canvas.getContext("2d");

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(session.transforms.rotateQuarterTurns * (Math.PI / 2));
  context.scale(session.transforms.flipX ? -1 : 1, session.transforms.flipY ? -1 : 1);
  context.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  context.restore();

  session.cache.orientedKey = key;
  session.cache.orientedCanvas = canvas;
  return canvas;
}

export function renderStageCanvas(session, canvas, viewportWidth, viewportHeight) {
  const orientedCanvas = getOrientedCanvas(session);
  if (!orientedCanvas) {
    return null;
  }

  const displaySize = fitInsideBox(
    orientedCanvas.width,
    orientedCanvas.height,
    Math.max(200, viewportWidth - 36),
    Math.max(220, viewportHeight - 36)
  );

  canvas.width = displaySize.width;
  canvas.height = displaySize.height;
  canvas.style.width = `${displaySize.width}px`;
  canvas.style.height = `${displaySize.height}px`;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(orientedCanvas, 0, 0, displaySize.width, displaySize.height);

  return {
    displayWidth: displaySize.width,
    displayHeight: displaySize.height,
    cropDisplayRect: getDisplayCropRect(
      session.transforms.cropRect,
      displaySize.width,
      displaySize.height
    ),
  };
}

export function buildOutputCanvas(session) {
  const orientedCanvas = getOrientedCanvas(session);
  if (!orientedCanvas) {
    return null;
  }

  const cropRect = getPixelCropRect(
    session.transforms.cropRect,
    orientedCanvas.width,
    orientedCanvas.height
  );
  const outputSize = getOutputSize(
    { width: cropRect.width, height: cropRect.height },
    session.transforms.resize
  );
  const outputCanvas = createCanvas(outputSize.width, outputSize.height);
  const context = outputCanvas.getContext("2d");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    orientedCanvas,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    outputSize.width,
    outputSize.height
  );

  return {
    canvas: outputCanvas,
    cropSize: { width: cropRect.width, height: cropRect.height },
    outputSize,
  };
}

export function renderResultPreview(session, canvas, maxPreviewSize = 420) {
  const output = buildOutputCanvas(session);
  if (!output) {
    return null;
  }

  const previewSize = fitInsideBox(
    output.outputSize.width,
    output.outputSize.height,
    maxPreviewSize,
    maxPreviewSize
  );

  canvas.width = previewSize.width;
  canvas.height = previewSize.height;
  canvas.hidden = false;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(output.canvas, 0, 0, previewSize.width, previewSize.height);

  return {
    ...output,
    previewSize,
  };
}
