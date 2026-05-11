import { test, expect } from "@playwright/test";
import { loginAs, devLoginAvailable } from "./helpers/auth";

// All tests here need the backend running with LIVONG_DEV_LOGIN=1.
// If the backend isn't reachable or dev-login isn't enabled, tests are skipped
// with a clear message — they don't fail the suite.
test.describe("Authenticated flows (skipped if backend dev-login unavailable)", () => {
  test.beforeAll(async ({ request }) => {
    const ok = await devLoginAvailable(request);
    test.skip(
      !ok,
      "Backend dev-login unavailable. Start with: LIVONG_DEV_LOGIN=1 ./livong server:start"
    );
  });

  test("authed user visiting / is redirected to /explore", async ({ page, request }) => {
    await loginAs(page, request, "+919900000001");
    await page.goto("/");
    await page.waitForURL("/explore", { timeout: 5000 });
    await expect(page).toHaveURL("/explore");
  });

  test("/matches loads for authed user", async ({ page, request }) => {
    await loginAs(page, request, "+919900000002");
    await page.goto("/matches");
    await expect(page).toHaveURL("/matches");
    // Either the matches list or an empty state — both are valid; don't be brittle.
    await page.waitForLoadState("networkidle");
  });

  test("/profile loads for authed user", async ({ page, request }) => {
    await loginAs(page, request, "+919900000003");
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    await page.waitForLoadState("networkidle");
  });

  test("logout clears auth and redirects to /", async ({ page, request }) => {
    await loginAs(page, request, "+919900000004");
    await page.goto("/explore");
    await page.waitForLoadState("networkidle");

    // Logout button is in the desktop sidebar (lg:flex), skip on mobile project.
    const logout = page.getByRole("button", { name: /log\s*out|sign\s*out/i }).first();
    if (!(await logout.count())) {
      test.skip(true, "no logout button visible (likely mobile viewport)");
      return;
    }

    await logout.click();
    // After fix: logout no longer navigates itself; AppShell's redirect effect
    // sends unauthed users on protected paths to /. Single source of truth.
    await page.waitForURL("/", { timeout: 3000 });
    const tokenAfter = await page.evaluate(() => localStorage.getItem("token"));
    expect(tokenAfter).toBeNull();
  });
});
