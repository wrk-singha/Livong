import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("toggles between light and dark", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const before = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    await page.getByRole("button", { name: /theme/i }).first().click();
    await page.waitForTimeout(100);

    const after = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    expect(after).toBe(!before);
  });

  test("theme choice persists across navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set to dark explicitly
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    // Navigate to /login, theme should stay dark
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  });
});
