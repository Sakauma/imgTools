import { applyAppearanceToCanvas } from "./appearance.js";
import { applyAdjustmentsToCanvas } from "./adjustments.js";
import { applyPosterEffectsToCanvas } from "./effects.js";
import { applyExpandToCanvas, getExpandedSize } from "./expand.js";
import { fitInsideBox, getDisplayCropRect, getOrientedSize, getPixelCropRect } from "./geometry.js";
import { getOutputSize } from "./export.js";
import { renderLayersToCanvas } from "./layers.js";
import { getOrientationCacheKey, getOutputCacheKey } from "./session.js";

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function scaleForPreview(value, scale) {
  return Math.max(0, Math.round((Number(value) || 0) * scale));
}

function scalePipelineForPreview(pipeline, scale) {
  return {
    ...pipeline,
    appearance: {
      ...pipeline.appearance,
      cornerRadius: scaleForPreview(pipeline.appearance.cornerRadius, scale),
      borderWidth: scaleForPreview(pipeline.appearance.borderWidth, scale),
    },
    layers: pipeline.layers.map((layer) => ({
      ...layer,
      fontSize: layer.type === "text" ? scaleForPreview(layer.fontSize, scale) : layer.fontSize,
      strokeWidth: layer.type === "shape" ? scaleForPreview(layer.strokeWidth, scale) : layer.strokeWidth,
    })),
  };
}

function renderPipelineFromCrop(session, cropRect, contentSize, pipeline = session.pipeline) {
  const orientedCanvas = getOrientedCanvas(session);
  if (!orientedCanvas) {
    return null;
  }

  const outputCanvas = createCanvas(contentSize.width, contentSize.height);
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
    contentSize.width,
    contentSize.height
  );

  const adjustedCanvas = applyAdjustmentsToCanvas(outputCanvas, pipeline.adjustments);
  const effectedCanvas = applyPosterEffectsToCanvas(adjustedCanvas, pipeline.effects);
  const expandedCanvas = applyExpandToCanvas(
    effectedCanvas,
    pipeline.expand,
    pipeline.appearance.backgroundColor
  );
  const appearanceCanvas = applyAppearanceToCanvas(expandedCanvas, pipeline.appearance);
  return renderLayersToCanvas(appearanceCanvas, pipeline.layers);
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

export function renderStageCanvas(session, canvas, viewportWidth, viewportHeight, { outputPreview = false } = {}) {
  if (outputPreview) {
    const preview = buildPreviewCanvas(session, {
      width: Math.max(200, viewportWidth - 36),
      height: Math.max(220, viewportHeight - 36),
    });
    if (!preview) {
      return null;
    }

    canvas.width = preview.previewSize.width;
    canvas.height = preview.previewSize.height;
    canvas.style.width = `${preview.previewSize.width}px`;
    canvas.style.height = `${preview.previewSize.height}px`;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(preview.canvas, 0, 0);

    return {
      displayWidth: preview.previewSize.width,
      displayHeight: preview.previewSize.height,
      cropDisplayRect: null,
    };
  }

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

  const adjustedCanvas = applyAdjustmentsToCanvas(canvas, session.pipeline.adjustments);
  const effectedCanvas = applyPosterEffectsToCanvas(adjustedCanvas, session.pipeline.effects);
  if (effectedCanvas !== canvas) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(effectedCanvas, 0, 0);
  }

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
      contentSize: structuredClone(session.cache.outputMeta.contentSize),
      outputSize: structuredClone(session.cache.outputMeta.outputSize),
    };
  }

  const cropRect = getPixelCropRect(
    session.pipeline.crop.rect,
    orientedCanvas.width,
    orientedCanvas.height
  );
  const contentSize = getOutputSize(
    { width: cropRect.width, height: cropRect.height },
    session.pipeline.resize
  );
  const finalCanvas = renderPipelineFromCrop(session, cropRect, contentSize);
  const outputSize = { width: finalCanvas.width, height: finalCanvas.height };
  const outputMeta = {
    cropSize: { width: cropRect.width, height: cropRect.height },
    contentSize,
    outputSize,
  };

  session.cache.outputKey = cacheKey;
  session.cache.outputCanvas = finalCanvas;
  session.cache.outputMeta = structuredClone(outputMeta);

  return {
    canvas: finalCanvas,
    cropSize: outputMeta.cropSize,
    contentSize: outputMeta.contentSize,
    outputSize: outputMeta.outputSize,
  };
}

export function buildPreviewCanvas(session, maxPreviewSize = 420) {
  const orientedCanvas = getOrientedCanvas(session);
  if (!orientedCanvas) {
    return null;
  }

  const previewBounds = typeof maxPreviewSize === "number"
    ? { width: maxPreviewSize, height: maxPreviewSize }
    : maxPreviewSize;
  const cropRect = getPixelCropRect(
    session.pipeline.crop.rect,
    orientedCanvas.width,
    orientedCanvas.height
  );
  const contentSize = getOutputSize(
    { width: cropRect.width, height: cropRect.height },
    session.pipeline.resize
  );
  const outputSize = getExpandedSize(contentSize, session.pipeline.expand);
  const previewSize = fitInsideBox(
    outputSize.width,
    outputSize.height,
    previewBounds.width,
    previewBounds.height
  );
  const previewScale = Math.min(
    previewSize.width / outputSize.width,
    previewSize.height / outputSize.height,
    1
  );
  const previewContentSize = {
    width: Math.max(1, Math.round(contentSize.width * previewScale)),
    height: Math.max(1, Math.round(contentSize.height * previewScale)),
  };
  const previewPipeline = scalePipelineForPreview(session.pipeline, previewScale);
  const canvas = renderPipelineFromCrop(session, cropRect, previewContentSize, previewPipeline);

  return {
    canvas,
    cropSize: { width: cropRect.width, height: cropRect.height },
    contentSize,
    outputSize,
    previewSize: { width: canvas.width, height: canvas.height },
  };
}

export function renderResultPreview(session, canvas, maxPreviewSize = 420) {
  const output = buildPreviewCanvas(session, maxPreviewSize);
  if (!output) {
    return null;
  }

  canvas.width = output.previewSize.width;
  canvas.height = output.previewSize.height;
  canvas.hidden = false;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(output.canvas, 0, 0);

  return output;
}
