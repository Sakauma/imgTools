export function bindInput(root, selector, handler) {
  root.querySelector(selector)?.addEventListener("input", (event) => {
    handler(event.target.value, event);
  });
}

export function bindRange(root, selector, handler) {
  bindInput(root, selector, (value, event) => {
    handler(Number(value), event);
  });
}

export function bindCheckbox(root, selector, handler) {
  root.querySelector(selector)?.addEventListener("change", (event) => {
    handler(event.target.checked, event);
  });
}

export function bindSelect(root, selector, handler) {
  root.querySelector(selector)?.addEventListener("change", (event) => {
    handler(event.target.value, event);
  });
}

export function bindClick(root, selector, handler) {
  root.querySelector(selector)?.addEventListener("click", handler);
}
