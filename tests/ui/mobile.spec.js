import { expect, test } from "@playwright/test";

import { expectInViewport, openWorkbench } from "./helpers.js";

test.use({
  viewport: {
    width: 390,
    height: 844,
  },
});

test("mobile workbench keeps tool controls reachable without page scrolling", async ({ page }) => {
  await openWorkbench(page);

  await expect(page.locator(".tools-panel")).toBeVisible();
  await expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole("button", { name: "调整" }).click();
  await expectInViewport(page, page.locator("#brightnessRange"));

  await page.getByRole("button", { name: "外观" }).click();
  await expectInViewport(page, page.locator("#expandEnabled"));

  await page.getByRole("button", { name: "导出" }).click();
  await expectInViewport(page, page.locator("#exportFormatSelect"));
  await expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
