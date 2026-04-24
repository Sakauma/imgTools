import { createDefaultAdjustments } from "./adjustments.js";
import { createDefaultEffects } from "./effects.js";

export const POSTER_PRESETS = [
  {
    id: "manga-poster",
    label: "Manga Poster",
    description: "高亮漫画扫描底图，适合叠加粗体文字和色块。",
    adjustments: { brightness: 28, contrast: -18, saturation: -62, sharpen: 18 },
    effects: { grayscale: true, threshold: 18, paperLift: 58, lineFade: 50, grain: 18, paperTexture: 20, halftone: 8 },
  },
  {
    id: "zine-scan",
    label: "Zine Scan",
    description: "更脏的复印杂志感，保留颗粒和纸纹。",
    adjustments: { brightness: 16, contrast: 16, saturation: -42, sharpen: 28 },
    effects: { grayscale: true, threshold: 34, paperLift: 38, lineFade: 22, grain: 44, paperTexture: 42, halftone: 18 },
  },
  {
    id: "xerox",
    label: "Xerox",
    description: "黑白复印效果，线条更硬。",
    adjustments: { brightness: 8, contrast: 42, saturation: -100, sharpen: 36 },
    effects: { grayscale: true, threshold: 58, paperLift: 24, lineFade: 8, grain: 28, paperTexture: 16, halftone: 0 },
  },
  {
    id: "halftone",
    label: "Halftone",
    description: "半调网点和轻复古纸面。",
    adjustments: { brightness: 10, contrast: 8, saturation: -36, sharpen: 12 },
    effects: { grayscale: false, threshold: 12, paperLift: 30, lineFade: 10, grain: 16, paperTexture: 18, halftone: 54 },
  },
];

export function getPreset(presetId) {
  return POSTER_PRESETS.find((preset) => preset.id === presetId) ?? POSTER_PRESETS[0];
}

export function applyPresetToPipeline(pipeline, presetId) {
  const preset = getPreset(presetId);
  pipeline.adjustments = {
    ...createDefaultAdjustments(),
    ...preset.adjustments,
  };
  pipeline.effects = {
    ...createDefaultEffects(),
    ...preset.effects,
  };
  return preset;
}
