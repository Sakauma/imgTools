export const TOOL_SHORTCUTS = {
  c: "crop",
  r: "rotate",
  s: "resize",
  a: "adjustments",
  e: "effects",
  b: "brush",
  t: "text",
  h: "shapes",
  l: "layers",
  p: "presets",
  o: "appearance",
  x: "export",
};

function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase?.() ?? "";
  return Boolean(
    target?.isContentEditable ||
      tagName === "input" ||
      tagName === "select" ||
      tagName === "textarea"
  );
}

export function getShortcutCommand(event) {
  if (isEditableTarget(event.target)) {
    return null;
  }

  const key = String(event.key || "").toLowerCase();
  const usesCommandModifier = event.metaKey || event.ctrlKey;

  if (usesCommandModifier && key === "z") {
    return { type: event.shiftKey ? "redo" : "undo" };
  }

  if (event.altKey || event.metaKey || event.ctrlKey) {
    return null;
  }

  const toolId = TOOL_SHORTCUTS[key];
  return toolId ? { type: "tool", toolId } : null;
}
