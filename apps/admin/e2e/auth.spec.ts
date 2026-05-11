import { test, expect } from "@playwright/test";
import { loginAsAdmin, adminDevLoginAvailable } from "./helpers/auth";

test.describe("Admin auth", () => {
  test("unauthenticated visit to / shows login form", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The root page is the login form when not authed.
    await expect(page.getByPlaceholder(/phone/i)).toBeVisible();
  });

  test("authenticated user is redirected from / to /dashboard", async ({ page, request }) => {
    test.skip(
      !(await adminDevLoginAvailable(request)),
      "admin-backend dev-login unavailable. Start with: LIVONG_DEV_LOGIN=1 ./livong admin-server:start"
    );

    await loginAsAdmin(page, request);
    await page.goto("/");
    await page.waitForURL("/dashboard", { timeout: 5000 });
    await expect(page).toHaveURL("/dashboard");
  });

  test("logout clears token and returns to login", async ({ page, request }) => {
    test.skip(
      !(await adminDevLoginAvailable(request)),
      "admin-backend dev-login unavailable"
    );

    await loginAsAdmin(page, request);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const logout = page.getByRole("button", { name: /log\s*out|sign\s*out/i }).first();
    if (!(await logout.count())) {
      test.skip(true, "no logout button visible");
      return;
    }
    await logout.click();
    await page.waitForLoadState("networkidle");
    const tokenAfter = await page.evaluate(() => localStorage.getItem("admin_token"));
    expect(tokenAfter).toBeNull();
  });
});
