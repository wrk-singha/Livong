"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "livong_consent_v1";

type Consent = "accepted" | "essential-only";

/**
 * DPDP Act 2023 (India) requires explicit consent for non-essential personal-data
 * processing. We don't ship any non-essential trackers TODAY — but Sentry +
 * PostHog are queued, and shipping those without consent would be a violation.
 *
 * Banner shows once per browser; choice persists in localStorage. When we wire
 * analytics, gate them behind: localStorage.getItem(STORAGE_KEY) === "accepted".
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
  }, []);

  const decide = (choice: Consent) => {
    localStorage.setItem(STORAGE_KEY, choice);
    setShow(false);
    // Tell any analytics consumers (when wired)
    window.dispatchEvent(new CustomEvent("livong:consent", { detail: choice }));
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-xs text-secondary leading-relaxed flex-1">
          Livong uses essential cookies for sign-in. With your consent we&apos;ll also use analytics to improve the product (no ads, no third-party data sales).{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => decide("essential-only")}
            className="px-3 py-1.5 text-xs font-medium text-dim hover:text-secondary border border-border rounded-lg transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={() => decide("accepted")}
            className="btn-accent px-4 py-1.5 text-xs font-medium rounded-lg"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper for analytics callers: only fire if the user opted in.
 *   if (hasAnalyticsConsent()) posthog.capture(...)
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "accepted";
}
