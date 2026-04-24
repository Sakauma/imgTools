import { expect } from "@playwright/test";

export async function openWorkbench(page) {
  await page.goto("/");
  await expect(page.locator("#sourceMeta")).not.toHaveText("未加载");
  await expect(page.locator("#cropMeta")).not.toHaveText("未选择");
  await expect(page.locator("#resultCanvas")).toBeVisible();
}

export async function expectInViewport(page, locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}
