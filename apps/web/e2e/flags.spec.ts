import { test, expect } from "@playwright/test";
import { devLoginAvailable } from "./helpers/auth";

const BACKEND_URL = process.env.LIVONG_BACKEND_URL || "http://localhost:6980";

test.describe("Feature flags", () => {
  test.beforeAll(async ({ request }) => {
    const ok = await devLoginAvailable(request);
    test.skip(
      !ok,
      "Backend dev-login unavailable. Start with: LIVONG_DEV_LOGIN=1 ./livong server:start"
    );
  });

  test("GET /flags returns the seeded keys", async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/flags`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as Record<string, boolean>;

    // Every flag the migration seeds should be present.
    expect(body).toHaveProperty("maintenance_mode");
    expect(body).toHaveProperty("chat_enabled");
    expect(body).toHaveProperty("rent_enabled");
    expect(body).toHaveProperty("interests_enabled");
    expect(body).toHaveProperty("create_listing_enabled");
    expect(body).toHaveProperty("profile_delete_enabled");

    // Maintenance MUST default to off — if it's somehow on in CI, every
    // other test in this run is about to break, so fail loud here first.
    expect(body.maintenance_mode).toBe(false);
  });

  // Faking /flags in the browser instead of toggling in the DB keeps this
  // test parallel-safe — no shared mutable state with other workers.
  test("frontend shows maintenance overlay when flag is on", async ({ page }) => {
    await page.route("**/flags", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          maintenance_mode: true,
          chat_enabled: true,
          rent_enabled: true,
          interests_enabled: true,
          create_listing_enabled: true,
          profile_delete_enabled: true,
        }),
      })
    );
    await page.goto("/");
    await expect(page.getByText(/back in a few minutes/i)).toBeVisible({ timeout: 5000 });
  });

  test("frontend hides Rent + List nav items when those flags are off", async ({ page, request }) => {
    // Need to be authed to see the nav at all — log in fresh.
    const res = await request.post(`${BACKEND_URL}/auth/_dev-login`, {
      data: { phone: "+919900099001" },
    });
    const { token, userId } = (await res.json()) as { token: string; userId: string };

    await page.route("**/flags", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          maintenance_mode: false,
          chat_enabled: true,
          rent_enabled: false,           // off
          interests_enabled: true,
          create_listing_enabled: false, // off
          profile_delete_enabled: true,
        }),
      })
    );

    // Set auth + consent BEFORE navigation so the chat/rent decision is made
    // with the right state on first paint.
    await page.goto("/");
    await page.evaluate(
      ({ token, userId }) => {
        localStorage.setItem("token", token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("livong_consent_v1", "accepted");
      },
      { token, userId }
    );
    await page.goto("/explore");

    // Explore + Matches + Profile are always-on. List + Rent should be hidden.
    // Use sidebar (desktop) — both projects render it on the desktop viewport.
    await expect(page.getByRole("link", { name: /explore/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: /^list$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^rent$/i })).toHaveCount(0);
  });
});
