import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BALANCE_TEST_BASE_URL ?? "http://localhost:5173",
    // Only isolated TLS browser tests use a local test CA; production code never bypasses TLS.
    ignoreHTTPSErrors: process.env.BALANCE_TEST_HTTPS === "true",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "light",
    locale: "ru-RU",
  },
  projects: [
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        channel: process.platform === "win32" ? "msedge" : undefined,
        viewport: { width: 1440, height: 1050 },
      },
    },
    {
      name: "iphone",
      use: {
        browserName: "chromium",
        channel: process.platform === "win32" ? "msedge" : undefined,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
