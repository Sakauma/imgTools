import { expect, test } from "@playwright/test";

import { openWorkbench } from "./helpers.js";

test("desktop default workbench matches the visual baseline", async ({ page }) => {
  await openWorkbench(page);
  await expect(page).toHaveScreenshot("desktop-workbench.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("desktop appearance panel matches the visual baseline", async ({ page }) => {
  await openWorkbench(page);
  await page.getByRole("button", { name: "外观" }).click();
  await page.locator("#expandEnabled").check();
  await page.getByRole("button", { name: "4:5" }).click();
  await page.locator("#backgroundEnabled").check();

  await expect(page).toHaveScreenshot("desktop-appearance-panel.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("desktop manga poster preset matches the visual baseline", async ({ page }) => {
  await openWorkbench(page);
  await page.locator('[data-tool-id="presets"]').click();
  await page.getByRole("button", { name: /Manga Poster/ }).click();

  await expect(page).toHaveScreenshot("desktop-manga-poster.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("desktop poster layers match the visual baseline", async ({ page }) => {
  await openWorkbench(page);
  await page.locator('[data-tool-id="text"]').click();
  await page.locator("#addTextLayer").click();
  await page.locator('[data-tool-id="shapes"]').click();
  await page.locator("#addShapeLayer").click();
  await page.locator('[data-tool-id="effects"]').click();
  await page.locator("#effectGrayscale").check();
  await page.locator("#effectThreshold").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "35");

  await expect(page).toHaveScreenshot("desktop-poster-layers.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test.describe("mobile visual baselines", () => {
  test.use({
    viewport: {
      width: 390,
      height: 844,
    },
  });

  test("mobile default workbench matches the visual baseline", async ({ page }) => {
    await openWorkbench(page);
    await expect(page).toHaveScreenshot("mobile-workbench.png", {
      animations: "disabled",
      caret: "hide",
    });
  });
});
