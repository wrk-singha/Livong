import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/explore",
  "/matches",
  "/profile",
  "/profile/setup",
  "/create-listing",
  "/rent",
  "/plans",
];

test.describe("Auth redirects (unauthenticated)", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("/");
      await expect(page).toHaveURL("/");
    });
  }

  test("/ stays on /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });

  test("/login stays on /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/login");
  });
});
