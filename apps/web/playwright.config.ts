import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:6900",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Pixel 5 = Chromium-based device emulation (iPhone presets force WebKit)
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    // Use the production build in CI — much faster cold start than `pnpm dev`
    // on a tiny Linux runner, and closer to what users hit. `pnpm dev` is fine
    // locally because reuseExistingServer picks up an already-running dev.
    command: process.env.CI ? "pnpm build && PORT=6900 pnpm start" : "pnpm dev",
    url: "http://localhost:6900",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
