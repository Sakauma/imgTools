import { applyAppearanceToCanvas } from "./appearance.js";
import { applyAdjustmentsToCanvas } from "./adjustments.js";
import { fitInsideBox, getDisplayCropRect, getOrientedSize, getPixelCropRect } from "./geometry.js";
import { getOutputSize } from "./export.js";
import { getOrientationCacheKey, getOutputCacheKey } from "./session.js";

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

  const key = getOrientationCacheKey(session);
  if (session.cache.orientedKey === key && session.cache.orientedCanvas) {
    return session.cache.orientedCanvas;
  }

  const { image, width: sourceWidth, height: sourceHeight } = session.source;
  const orientedSize = getOrientedSize(
    sourceWidth,
    sourceHeight,
    session.pipeline.orientation.rotateQuarterTurns
  );
  const canvas = createCanvas(orientedSize.width, orientedSize.height);
  const context = canvas.getContext("2d");

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(session.pipeline.orientation.rotateQuarterTurns * (Math.PI / 2));
  context.scale(
    session.pipeline.orientation.flipX ? -1 : 1,
    session.pipeline.orientation.flipY ? -1 : 1
  );
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
      session.pipeline.crop.rect,
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

  const cacheKey = getOutputCacheKey(session);
  if (session.cache.outputKey === cacheKey && session.cache.outputCanvas && session.cache.outputMeta) {
    return {
      canvas: session.cache.outputCanvas,
      cropSize: structuredClone(session.cache.outputMeta.cropSize),
      outputSize: structuredClone(session.cache.outputMeta.outputSize),
    };
  }

  const cropRect = getPixelCropRect(
    session.pipeline.crop.rect,
    orientedCanvas.width,
    orientedCanvas.height
  );
  const outputSize = getOutputSize(
    { width: cropRect.width, height: cropRect.height },
    session.pipeline.resize
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

  const adjustedCanvas = applyAdjustmentsToCanvas(outputCanvas, session.pipeline.adjustments);
  const finalCanvas = applyAppearanceToCanvas(adjustedCanvas, session.pipeline.appearance);
  const outputMeta = {
    cropSize: { width: cropRect.width, height: cropRect.height },
    outputSize,
  };

  session.cache.outputKey = cacheKey;
  session.cache.outputCanvas = finalCanvas;
  session.cache.outputMeta = structuredClone(outputMeta);

  return {
    canvas: finalCanvas,
    cropSize: outputMeta.cropSize,
    outputSize: outputMeta.outputSize,
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
