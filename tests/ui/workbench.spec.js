import { expect, test } from "@playwright/test";

async function openWorkbench(page) {
  await page.goto("/");
  await expect(page.locator("#sourceMeta")).not.toHaveText("未加载");
  await expect(page.locator("#cropMeta")).not.toHaveText("未选择");
  await expect(page.locator("#resultCanvas")).toBeVisible();
}

test("loads the demo image and renders session summary", async ({ page }) => {
  await openWorkbench(page);

  await expect(page.locator("#sourceMeta")).toContainText("px");
  await expect(page.locator("#outputMeta")).toContainText("px");
  await expect(page.locator("#transformMeta")).toHaveText("仅裁剪");
});

test("resizing the crop box updates crop and output summary", async ({ page }) => {
  await openWorkbench(page);

  const cropMeta = page.locator("#cropMeta");
  const before = await cropMeta.textContent();
  const handlePoint = await page.locator("#cropBox .handle-se").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  });
  const cropBox = await page.locator("#cropBox").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  await page.mouse.move(handlePoint.x, handlePoint.y);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + cropBox.width * 0.72, cropBox.y + cropBox.height * 0.72, {
    steps: 12,
  });
  await page.mouse.up();

  await expect(cropMeta).not.toHaveText(before ?? "");
  await expect(page.locator("#outputMeta")).toHaveText(await cropMeta.textContent());
});

test("rotate tool works with undo and redo", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "旋转" }).click();
  await page.getByRole("button", { name: "右转 90°" }).click();
  await expect(page.locator("#transformMeta")).toContainText("旋转 90°");

  await page.locator("#undoBtn").click();
  await expect(page.locator("#transformMeta")).toHaveText("仅裁剪");

  await page.locator("#redoBtn").click();
  await expect(page.locator("#transformMeta")).toContainText("旋转 90°");
});

test("resize and export settings update output metadata", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "尺寸" }).click();
  await page.locator("#resizeEnabled").check();
  await page.locator("#resizeWidth").fill("640");
  await expect(page.locator("#outputMeta")).toHaveText(/640 × \d+px/);

  await page.getByRole("button", { name: "导出" }).click();
  await page.locator("#exportFormatSelect").selectOption("image/jpeg");
  await expect(page.locator("#exportMeta")).toContainText("JPEG");
  await expect(page.locator("#exportMeta")).toContainText("640 ×");
});

test("download uses the selected format extension", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "导出" }).click();
  await page.locator("#exportFormatSelect").selectOption("image/webp");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载导出结果" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("demo.webp");
});
