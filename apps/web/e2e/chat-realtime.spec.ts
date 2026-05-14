import { test, expect } from "@playwright/test";
import { loginAs, devLoginAvailable } from "./helpers/auth";

const BACKEND_URL = process.env.LIVONG_BACKEND_URL || "http://localhost:6980";

// Seed users with a pre-existing match (see apps/backend/internal/seed/seed.go).
// We use the seeded match because creating a new match in-test requires going
// through interest → accept → matches creation, which is slow and not what
// we're testing here.
const RAHUL = "+9199999901";
const PRIYA = "+9199999902";

test.describe("Chat real-time delivery (WebSocket)", () => {
  test.beforeAll(async ({ request }) => {
    const ok = await devLoginAvailable(request);
    test.skip(
      !ok,
      "Backend dev-login unavailable. Start with: LIVONG_DEV_LOGIN=1 ./livong server:start"
    );
  });

  // Two browser contexts simulate two real users on two devices. Sending from
  // one should appear in the other in well under the 5s polling interval —
  // anything < 1.5s is the WebSocket doing the work, not polling getting lucky.
  test("message sent in one window appears in the other within 1.5s", async ({ browser, request }) => {
    // Resolve the shared match by asking Rahul's API session for his matches.
    const rahul = await loginAs(
      await (await browser.newContext()).newPage(),
      request,
      RAHUL
    );
    const matchesRes = await request.get(`${BACKEND_URL}/matches`, {
      headers: { Authorization: `Bearer ${rahul.token}` },
    });
    if (!matchesRes.ok()) {
      test.skip(true, "couldn't list matches; seed may not have run");
      return;
    }
    const matches = (await matchesRes.json()) as Array<{ matchId: string }>;
    if (!matches?.length) {
      test.skip(true, "no seeded match between Rahul and Priya — run `go run ./cmd/seed` in apps/backend");
      return;
    }
    const matchId = matches[0].matchId;

    // Two fresh contexts so the WebSockets are genuinely independent (no
    // shared singleton between them — each browser context has its own
    // `lib/ws.ts` module instance).
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await loginAs(pageA, request, RAHUL);
    await loginAs(pageB, request, PRIYA);

    await pageA.goto(`/chat/${matchId}`);
    await pageB.goto(`/chat/${matchId}`);

    // Wait for both pages to render the input — proxy for "WS likely connected".
    // partysocket auto-connects on first ensureConnected() call, which the
    // useChatStream hook fires on mount.
    await pageA.waitForSelector('input[placeholder="Type a message..."]', { timeout: 5000 });
    await pageB.waitForSelector('input[placeholder="Type a message..."]', { timeout: 5000 });

    // Give partysocket a beat to actually open the connection + subscribe.
    // 750ms is comfortable under the 5s polling threshold so we don't accidentally
    // give polling a head start on the assertion below.
    await pageA.waitForTimeout(750);
    await pageB.waitForTimeout(750);

    const uniqueText = `realtime-test-${Date.now()}`;

    // Rahul sends. Use Promise.all to start both the send AND the read clock
    // at the same instant — minimizes test-side noise in the latency budget.
    const t0 = Date.now();
    await pageA.fill('input[placeholder="Type a message..."]', uniqueText);
    await pageA.getByRole("button", { name: /send message/i }).click();

    // Priya should see it. 1500ms strongly implies WS — average polling delay
    // is ~2.5s with 5s interval, so beating 1.5s consistently means a push,
    // not a poll.
    await expect(pageB.getByText(uniqueText)).toBeVisible({ timeout: 1500 });
    const dtMs = Date.now() - t0;
    console.log(`✓ realtime delivery: ${dtMs}ms`);
    // Sanity: also be visible to the sender.
    await expect(pageA.getByText(uniqueText)).toBeVisible({ timeout: 1500 });

    await ctxA.close();
    await ctxB.close();
  });
});
