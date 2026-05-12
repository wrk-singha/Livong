import { test, expect } from "@playwright/test";
import { loginAsAdmin, adminDevLoginAvailable } from "./helpers/auth";

const ADMIN_ROUTES = [
  "/dashboard",
  "/users",
  "/listings",
  "/matches",
  "/interests",
  "/reviews",
  "/revenue",
  "/analytics",
];

test.describe("Admin routes (authed)", () => {
  test.beforeAll(async ({ request }) => {
    test.skip(
      !(await adminDevLoginAvailable(request)),
      "admin-backend dev-login unavailable. Start with: LIVONG_DEV_LOGIN=1 ./livong admin-server:start"
    );
  });

  for (const route of ADMIN_ROUTES) {
    test(`${route} loads with no console errors`, async ({ page, request }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      });
      page.on("response", (r) => {
        // Surface 4xx/5xx from API calls
        if (r.status() >= 400 && r.url().includes(":6981/")) {
          errors.push(`HTTP ${r.status()} on ${r.url().slice(0, 80)}`);
        }
      });

      await loginAsAdmin(page, request);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(route);

      // Filter out benign hot-reload + browser noise that isn't an app bug.
      const real = errors.filter(
        (e) => !/devtools|hmr|fast refresh|favicon/i.test(e)
      );
      if (real.length > 0) {
        throw new Error("console errors:\n" + real.join("\n"));
      }
    });
  }
});
