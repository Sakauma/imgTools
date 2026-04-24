import { getAppearanceSummary, hasActiveAppearance } from "./appearance.js";
import { getAdjustmentSummary, hasActiveAdjustments } from "./adjustments.js";
import { getEffectsSummary, hasActiveEffects } from "./effects.js";
import { getExpandSummary, hasActiveExpand } from "./expand.js";
import { isQualityAdjustable } from "./export.js";
import { getLayerSummary, normalizeLayers } from "./layers.js";

export function getTransformSummary(session, derived) {
  if (!session.source) {
    return "无";
  }

  const bits = [];
  const rotation = session.pipeline.orientation.rotateQuarterTurns * 90;
  if (rotation) bits.push(`旋转 ${rotation}°`);
  if (session.pipeline.orientation.flipX) bits.push("水平翻转");
  if (session.pipeline.orientation.flipY) bits.push("垂直翻转");
  if (session.pipeline.resize.enabled) bits.push("已调整尺寸");
  if (hasActiveExpand(derived.contentSize, session.pipeline.expand)) {
    bits.push(getExpandSummary(derived.contentSize, session.pipeline.expand));
  }
  if (hasActiveAdjustments(session.pipeline.adjustments)) {
    bits.push(getAdjustmentSummary(session.pipeline.adjustments));
  }
  if (hasActiveAppearance(session.pipeline.appearance)) {
    bits.push(getAppearanceSummary(session.pipeline.appearance));
  }
  if (hasActiveEffects(session.pipeline.effects)) {
    bits.push(getEffectsSummary(session.pipeline.effects));
  }
  if (normalizeLayers(session.pipeline.layers).length > 0) {
    bits.push(getLayerSummary(session.pipeline.layers));
  }
  return bits.length > 0 ? bits.join(" · ") : "仅裁剪";
}

export function getExportSummary(session, preview, format, contentSize) {
  const qualityPart = isQualityAdjustable(session.exportOptions.format)
    ? ` · 质量 ${Math.round(session.exportOptions.quality * 100)}%`
    : " · 原始质量";
  const expandPart = hasActiveExpand(contentSize, session.pipeline.expand)
    ? ` · ${getExpandSummary(contentSize, session.pipeline.expand)}`
    : "";
  const appearancePart = hasActiveAppearance(session.pipeline.appearance)
    ? ` · ${getAppearanceSummary(session.pipeline.appearance)}`
    : "";
  const effectsPart = hasActiveEffects(session.pipeline.effects)
    ? ` · ${getEffectsSummary(session.pipeline.effects)}`
    : "";
  const layersPart = normalizeLayers(session.pipeline.layers).length
    ? ` · ${getLayerSummary(session.pipeline.layers)}`
    : "";

  return `${format.label} · ${preview.outputSize.width} × ${preview.outputSize.height}px${qualityPart}${expandPart}${appearancePart}${effectsPart}${layersPart}`;
}
