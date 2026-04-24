import { defineConfig } from "@playwright/test";

const shouldStartWebServer = process.env.PW_TEST_SKIP_WEBSERVER !== "1";
const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const webServerCommand = `node scripts/serve-static.mjs --port ${port}`;

export default defineConfig({
  testDir: "./tests/perf",
  timeout: 120_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    viewport: {
      width: 1280,
      height: 900,
    },
    trace: "retain-on-failure",
  },
  webServer: shouldStartWebServer
    ? {
        command: webServerCommand,
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
      }
    : undefined,
});
