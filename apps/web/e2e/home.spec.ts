import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads with hero and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Find the right/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started/i }).first()).toBeVisible();
  });

  test("Sign in link goes to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Sign in/i }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: /Sign in with your phone/i })).toBeVisible();
  });

  test("no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
