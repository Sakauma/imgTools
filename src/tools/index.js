import { adjustmentsTool } from "./adjustments.js";
import { appearanceTool } from "./appearance.js";
import { brushTool } from "./brush.js";
import { cropTool } from "./crop.js";
import { effectsTool } from "./effects.js";
import { resizeTool } from "./resize.js";
import { rotateTool } from "./rotate.js";
import { exportTool } from "./export.js";
import { layersTool } from "./layers.js";
import { presetsTool } from "./presets.js";
import { shapesTool } from "./shapes.js";
import { textTool } from "./text.js";

function withToolMeta(tool, meta) {
  return { ...tool, ...meta };
}

export const toolGroups = [
  {
    id: "base",
    label: "基础",
    tools: [
      withToolMeta(cropTool, { icon: "⌗" }),
      withToolMeta(rotateTool, { icon: "↻" }),
      withToolMeta(resizeTool, { icon: "□" }),
    ],
  },
  {
    id: "tone",
    label: "色彩",
    tools: [
      withToolMeta(adjustmentsTool, { icon: "◐" }),
      withToolMeta(effectsTool, { icon: "✦" }),
    ],
  },
  {
    id: "create",
    label: "创作",
    tools: [
      withToolMeta(brushTool, { icon: "●" }),
      withToolMeta(textTool, { icon: "T" }),
      withToolMeta(shapesTool, { icon: "◆" }),
      withToolMeta(layersTool, { icon: "▣" }),
    ],
  },
  {
    id: "finish",
    label: "输出",
    tools: [
      withToolMeta(appearanceTool, { icon: "◫" }),
      withToolMeta(presetsTool, { icon: "★" }),
      withToolMeta(exportTool, { icon: "⇩" }),
    ],
  },
];
export const tools = toolGroups.flatMap((group) => group.tools);
export const toolMap = new Map(tools.map((tool) => [tool.id, tool]));
