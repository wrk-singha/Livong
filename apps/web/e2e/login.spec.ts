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

  test("hint shows remaining digits with correct singular/plural", async ({ page }) => {
    await page.goto("/login");
    const input = page.getByPlaceholder(/Enter your number/i);

    // Empty: no hint
    await expect(page.locator("#phone-hint")).toHaveCount(0);

    // 1 digit: "9 more digits"
    await input.fill("9");
    await expect(page.locator("#phone-hint")).toHaveText(/9 more digits/);

    // 9 digits: singular "1 more digit"
    await input.fill("987654321");
    await expect(page.locator("#phone-hint")).toHaveText(/1 more digit to enable/);
    await expect(page.locator("#phone-hint")).not.toHaveText(/digits/);

    // 10 digits: hint disappears, button enabled
    await input.fill("9876543210");
    await expect(page.locator("#phone-hint")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Continue/i })).toBeEnabled();
  });
});
