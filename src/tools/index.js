import { adjustmentsTool } from "./adjustments.js";
import { appearanceTool } from "./appearance.js";
import { cropTool } from "./crop.js";
import { effectsTool } from "./effects.js";
import { resizeTool } from "./resize.js";
import { rotateTool } from "./rotate.js";
import { exportTool } from "./export.js";
import { presetsTool } from "./presets.js";
import { shapesTool } from "./shapes.js";
import { textTool } from "./text.js";

export const tools = [
  cropTool,
  rotateTool,
  resizeTool,
  adjustmentsTool,
  effectsTool,
  textTool,
  shapesTool,
  appearanceTool,
  presetsTool,
  exportTool,
];
export const toolMap = new Map(tools.map((tool) => [tool.id, tool]));
