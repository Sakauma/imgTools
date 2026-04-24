import { expect, test } from "@playwright/test";

function buildLargeSvgFixture() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="6000" height="4000" viewBox="0 0 6000 4000">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
        <radialGradient id="orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#f97316" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="6000" height="4000" fill="url(#bg)" />
      <circle cx="1600" cy="1200" r="900" fill="url(#orb)" />
      <circle cx="4300" cy="2600" r="1100" fill="url(#orb)" />
      <g fill="none" stroke="#ffffff" stroke-opacity="0.18">
        <path d="M0 800h6000M0 1600h6000M0 2400h6000M0 3200h6000" />
        <path d="M1000 0v4000M2000 0v4000M3000 0v4000M4000 0v4000M5000 0v4000" />
      </g>
    </svg>
  `.trim();
}

async function waitForPreviewFlush(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      })
  );
}

test("24MP desktop adjustment and export smoke", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.locator("#imageInput").setInputFiles({
    name: "perf-24mp.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(buildLargeSvgFixture()),
  });

  await expect(page.locator("#sourceMeta")).toHaveText("6000 × 4000px");
  await expect(page.locator("#resultCanvas")).toBeVisible();

  const timings = {};

  await page.getByRole("button", { name: "调整" }).click();

  let startedAt = Date.now();
  await page.locator("#brightnessRange").evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, "30");
  await waitForPreviewFlush(page);
  timings.firstAdjustmentMs = Date.now() - startedAt;

  await page.getByRole("button", { name: "色彩" }).click();
  startedAt = Date.now();
  await page.locator("#grayscaleToggle").check();
  await waitForPreviewFlush(page);
  timings.secondAdjustmentMs = Date.now() - startedAt;

  await page.getByRole("button", { name: "导出" }).click();
  const downloadPromise = page.waitForEvent("download");
  startedAt = Date.now();
  await page.getByRole("button", { name: "下载导出结果" }).click();
  const download = await downloadPromise;
  timings.exportMs = Date.now() - startedAt;

  expect(download.suggestedFilename()).toBe("perf-24mp.png");
  console.log(`PERF ${JSON.stringify(timings)}`);
  await testInfo.attach("perf-timings", {
    body: JSON.stringify(timings, null, 2),
    contentType: "application/json",
  });
});

test("24MP desktop expand smoke", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.locator("#imageInput").setInputFiles({
    name: "perf-24mp-expand.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(buildLargeSvgFixture()),
  });

  await expect(page.locator("#sourceMeta")).toHaveText("6000 × 4000px");

  const timings = {};

  await page.getByRole("button", { name: "外观" }).click();

  let startedAt = Date.now();
  await page.locator("#expandEnabled").check();
  await page.getByRole("button", { name: "4:5" }).click();
  await waitForPreviewFlush(page);
  timings.expandPreviewMs = Date.now() - startedAt;

  await expect(page.locator("#transformMeta")).toContainText("扩边 4:5");

  const downloadPromise = page.waitForEvent("download");
  startedAt = Date.now();
  await page.getByRole("button", { name: "导出" }).click();
  await page.getByRole("button", { name: "下载导出结果" }).click();
  const download = await downloadPromise;
  timings.expandExportMs = Date.now() - startedAt;

  expect(download.suggestedFilename()).toBe("perf-24mp-expand.png");
  console.log(`PERF ${JSON.stringify(timings)}`);
  await testInfo.attach("perf-expand-timings", {
    body: JSON.stringify(timings, null, 2),
    contentType: "application/json",
  });
});

test("24MP desktop poster layers and effects smoke", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.locator("#imageInput").setInputFiles({
    name: "perf-24mp-poster.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(buildLargeSvgFixture()),
  });

  await expect(page.locator("#sourceMeta")).toHaveText("6000 × 4000px");
  const timings = {};

  await page.locator('[data-tool-id="presets"]').click();
  let startedAt = Date.now();
  await page.getByRole("button", { name: /Manga Poster/ }).click();
  await waitForPreviewFlush(page);
  timings.posterPresetMs = Date.now() - startedAt;

  await page.locator('[data-tool-id="text"]').click();
  await page.locator("#addTextLayer").click();
  await page.locator('[data-tool-id="shapes"]').click();
  await page.locator("#addShapeLayer").click();
  await waitForPreviewFlush(page);
  await expect(page.locator("#transformMeta")).toContainText("图层 2 个");

  const downloadPromise = page.waitForEvent("download");
  startedAt = Date.now();
  await page.locator('[data-tool-id="export"]').click();
  await page.getByRole("button", { name: "下载导出结果" }).click();
  const download = await downloadPromise;
  timings.posterExportMs = Date.now() - startedAt;

  expect(download.suggestedFilename()).toBe("perf-24mp-poster.png");
  console.log(`PERF ${JSON.stringify(timings)}`);
  await testInfo.attach("perf-poster-timings", {
    body: JSON.stringify(timings, null, 2),
    contentType: "application/json",
  });
});
