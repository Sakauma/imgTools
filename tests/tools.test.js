import test from "node:test";
import assert from "node:assert/strict";

import { toolGroups, toolMap, tools } from "../src/tools/index.js";

test("tool groups cover every tool with icon metadata", () => {
  const groupedTools = toolGroups.flatMap((group) => group.tools);

  assert.equal(groupedTools.length, tools.length);
  assert.equal(new Set(groupedTools.map((tool) => tool.id)).size, tools.length);
  assert.equal(toolMap.size, tools.length);
  assert.ok(groupedTools.every((tool) => tool.icon && tool.label && tool.hint));
});
