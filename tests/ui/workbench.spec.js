import { expect, test } from "@playwright/test";
import { expectInViewport, openWorkbench } from "./helpers.js";

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

test("adjustments tool updates session summary and supports undo", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "调整" }).click();
  await page.locator("#brightnessRange").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "30");
  await expect(page.locator("#transformMeta")).toContainText("亮度");

  await page.getByRole("button", { name: "色彩" }).click();
  await page.locator("#grayscaleToggle").check();
  await expect(page.locator("#transformMeta")).toContainText("灰度");

  await page.locator("#undoBtn").click();
  await expect(page.locator("#transformMeta")).not.toContainText("灰度");
  await expect(page.locator("#transformMeta")).toContainText("亮度");
});

test("tool panel stays usable in the expanded workspace", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "调整" }).click();
  await page.getByRole("button", { name: "基础" }).click();
  await expect(page.locator("#brightnessRange")).toBeVisible();

  await page.getByRole("button", { name: "外观" }).click();
  await expect(page.locator("#backgroundEnabled")).toBeVisible();
  await expect(page.locator("#expandEnabled")).toBeVisible();
  await page.locator("#cornerRadiusRange").scrollIntoViewIfNeeded();
  await expect(page.locator("#cornerRadiusRange")).toBeVisible();
});

test("appearance updates preview metadata without changing output size and supports undo", async ({
  page,
}) => {
  await openWorkbench(page);

  const outputMeta = page.locator("#outputMeta");
  const beforeOutputSize = await outputMeta.textContent();

  await page.getByRole("button", { name: "外观" }).click();
  await page.locator("#backgroundEnabled").check();
  await page.locator("#cornerRadiusRange").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "24");
  await page.locator("#borderEnabled").check();

  await expect(page.locator("#transformMeta")).toContainText("背景填充");
  await expect(page.locator("#transformMeta")).toContainText("圆角");
  await expect(page.locator("#transformMeta")).toContainText("边框");
  await expect(outputMeta).toHaveText(beforeOutputSize ?? "");
  await expect(page.locator("#exportMeta")).toContainText("背景填充");

  await page.locator("#undoBtn").click();
  await expect(page.locator("#transformMeta")).not.toContainText("边框");
  await expect(page.locator("#transformMeta")).toContainText("圆角");
  await expect(outputMeta).toHaveText(beforeOutputSize ?? "");
});

test("expand updates output metadata and supports undo", async ({ page }) => {
  await openWorkbench(page);

  const outputMeta = page.locator("#outputMeta");
  const beforeOutputSize = await outputMeta.textContent();

  await page.getByRole("button", { name: "外观" }).click();
  await page.locator("#expandEnabled").check();
  await page.getByRole("button", { name: "4:5" }).click();

  await expect(page.locator("#transformMeta")).toContainText("扩边 4:5");
  await expect(outputMeta).not.toHaveText(beforeOutputSize ?? "");
  await expect(page.locator("#exportMeta")).toContainText("扩边 4:5");
  const previewRatio = await page.locator("#resultCanvas").evaluate((canvas) => {
    return canvas.width / canvas.height;
  });
  expect(previewRatio).toBeGreaterThan(0.78);
  expect(previewRatio).toBeLessThan(0.82);

  await page.locator("#undoBtn").click();
  await expect(page.locator("#transformMeta")).not.toContainText("扩边 4:5");
  await expect(outputMeta).toHaveText(beforeOutputSize ?? "");
});

test("result preview stays fully inside its preview frame", async ({ page }) => {
  await openWorkbench(page);

  await page.getByRole("button", { name: "外观" }).click();
  await page.locator("#expandEnabled").check();
  await page.getByRole("button", { name: "4:5" }).click();

  const bounds = await page.locator("#resultCanvas").evaluate((canvas) => {
    const canvasRect = canvas.getBoundingClientRect();
    const frameRect = canvas.closest(".result-frame").getBoundingClientRect();
    return {
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
    };
  });

  expect(bounds.canvasWidth).toBeLessThanOrEqual(bounds.frameWidth);
  expect(bounds.canvasHeight).toBeLessThanOrEqual(bounds.frameHeight);
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

test("poster tools add text shape effects and presets", async ({ page }) => {
  await openWorkbench(page);

  await page.locator('[data-tool-id="text"]').click();
  await page.locator("#addTextLayer").click();
  await page.locator("#textValue").fill("PANICHIYO");
  await page.locator("#textRotation").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "-90");
  await expect(page.locator("#transformMeta")).toContainText("文字 1");

  await page.locator('[data-tool-id="shapes"]').click();
  await page.locator("#addShapeLayer").click();
  await page.locator("#shapeFill").fill("#d21919");
  await expect(page.locator("#transformMeta")).toContainText("色块 1");

  await page.locator('[data-tool-id="effects"]').click();
  await page.locator("#effectGrayscale").check();
  await page.locator("#effectThreshold").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "35");
  await expect(page.locator("#transformMeta")).toContainText("灰度");

  await page.locator('[data-tool-id="presets"]').click();
  await page.getByRole("button", { name: /Manga Poster/ }).click();
  await expect(page.locator("#transformMeta")).toContainText("纸张提亮");
  await expect(page.locator("#exportMeta")).toContainText("图层 2 个");
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
