import { adjustmentsTool } from "./adjustments.js";
import { cropTool } from "./crop.js";
import { resizeTool } from "./resize.js";
import { rotateTool } from "./rotate.js";
import { exportTool } from "./export.js";

export const tools = [cropTool, rotateTool, resizeTool, adjustmentsTool, exportTool];
export const toolMap = new Map(tools.map((tool) => [tool.id, tool]));
