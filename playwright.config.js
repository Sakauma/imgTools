import { defineConfig } from "@playwright/test";

const shouldStartWebServer = process.env.PW_TEST_SKIP_WEBSERVER !== "1";

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: {
      width: 1280,
      height: 900,
    },
    trace: "on-first-retry",
  },
  webServer: shouldStartWebServer
    ? {
        command: "python3 -m http.server 4173",
        port: 4173,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
