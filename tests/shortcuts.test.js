import test from "node:test";
import assert from "node:assert/strict";

import { getShortcutCommand } from "../src/app/shortcuts.js";

test("shortcut commands map desktop editing keys", () => {
  assert.deepEqual(getShortcutCommand({ key: "z", metaKey: true }), { type: "undo" });
  assert.deepEqual(getShortcutCommand({ key: "z", metaKey: true, shiftKey: true }), { type: "redo" });
  assert.deepEqual(getShortcutCommand({ key: "b" }), { type: "tool", toolId: "brush" });
  assert.deepEqual(getShortcutCommand({ key: "l" }), { type: "tool", toolId: "layers" });
});

test("shortcut commands ignore editable fields and modified tool keys", () => {
  assert.equal(getShortcutCommand({ key: "b", target: { tagName: "INPUT" } }), null);
  assert.equal(getShortcutCommand({ key: "b", metaKey: true }), null);
  assert.equal(getShortcutCommand({ key: "b", altKey: true }), null);
});
