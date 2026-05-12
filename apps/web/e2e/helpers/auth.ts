import type { Page, APIRequestContext } from "@playwright/test";

const BACKEND_URL = process.env.LIVONG_BACKEND_URL || "http://localhost:6980";

/**
 * Authenticate as a test user via the backend's dev-only OTP bypass endpoint.
 * Requires the backend to be running with `LIVONG_DEV_LOGIN=1`.
 *
 * Usage in a test:
 *   await loginAs(page, request, "+919900000001");
 *   await page.goto("/matches");
 */
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  phone: string
): Promise<{ token: string; userId: string }> {
  const res = await request.post(`${BACKEND_URL}/auth/_dev-login`, {
    data: { phone },
  });

  if (!res.ok()) {
    throw new Error(
      `dev-login failed (${res.status()}): backend is not running with LIVONG_DEV_LOGIN=1?\n` +
        `Start backend with: LIVONG_DEV_LOGIN=1 ./livong server:start`
    );
  }

  const body = (await res.json()) as { token: string; userId: string };

  // Set localStorage on the origin once. Don't use addInitScript — that would
  // re-inject the token on every navigation and break logout tests.
  await page.goto("/");
  await page.evaluate(
    ({ token, userId }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);
    },
    body
  );

  return body;
}

/**
 * Probe the dev-login endpoint to decide whether to skip auth-required tests.
 * Returns true if the backend is reachable AND has dev-login enabled.
 */
export async function devLoginAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.post(`${BACKEND_URL}/auth/_dev-login`, {
      data: { phone: "+919900000099" },
      timeout: 2000,
    });
    return res.ok();
  } catch {
    return false;
  }
}
