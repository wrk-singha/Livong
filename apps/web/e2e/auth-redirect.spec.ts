import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/explore",
  "/matches",
  "/profile",
  "/profile/setup",
  "/create-listing",
  "/rent",
];

const PUBLIC_ROUTES = ["/", "/login", "/plans"];

test.describe("Auth redirects (unauthenticated)", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("/");
      await expect(page).toHaveURL("/");
    });
  }

  for (const route of PUBLIC_ROUTES) {
    test(`${route} stays on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(route);
    });
  }
});
