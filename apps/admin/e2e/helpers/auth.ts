import type { Page, APIRequestContext } from "@playwright/test";

const ADMIN_BACKEND_URL = process.env.LIVONG_ADMIN_BACKEND_URL || "http://localhost:8081";

/**
 * Sign in as the seeded admin user by hitting admin-backend's dev-only OTP
 * bypass. Requires admin-backend to be running with `LIVONG_DEV_LOGIN=1`.
 *
 * Phone "7908038179" is seeded as is_admin=true by the main backend's
 * migrations (see apps/backend/internal/database/migrations.go).
 */
export async function loginAsAdmin(
  page: Page,
  request: APIRequestContext
): Promise<{ token: string; userId: string }> {
  const res = await request.post(`${ADMIN_BACKEND_URL}/auth/_dev-login`, {
    data: { phone: "7908038179" },
  });

  if (!res.ok()) {
    throw new Error(
      `admin dev-login failed (${res.status()}): admin-backend not running with LIVONG_DEV_LOGIN=1?\n` +
        `Start with: LIVONG_DEV_LOGIN=1 ./livong admin-server:start`
    );
  }

  const body = (await res.json()) as { token: string; userId: string };

  await page.goto("/");
  await page.evaluate((token) => {
    localStorage.setItem("admin_token", token);
  }, body.token);

  return body;
}

export async function adminDevLoginAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.post(`${ADMIN_BACKEND_URL}/auth/_dev-login`, {
      data: { phone: "7908038179" },
      timeout: 2000,
    });
    return res.ok();
  } catch {
    return false;
  }
}
