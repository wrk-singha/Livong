import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders phone form with +91 prefix", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("+91")).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your number/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible();
  });

  test("Continue button is disabled with empty input", async ({ page }) => {
    await page.goto("/login");
    const button = page.getByRole("button", { name: /Continue/i });
    await expect(button).toBeDisabled();
  });

  test("Back link returns to home", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Back/i }).click();
    await expect(page).toHaveURL("/");
  });
});
