"use client";

import { useFlags, FLAG_KEYS } from "@/contexts/flags";
import { PageTitle } from "@/lib/PageTitle";

/**
 * Full-screen takeover when the admin has flipped maintenance_mode ON.
 * The FlagsContext polls every 30s, so when the admin flips it back OFF the
 * user is automatically restored to the app — no refresh needed.
 *
 * Render this in AppShell BEFORE the children, so it short-circuits every
 * authenticated page. Public landing/legal pages are still accessible (this
 * sits inside AppShell which only wraps authed routes).
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { isEnabled, loading } = useFlags();

  // While loading, render children optimistically. If maintenance is on,
  // the gate will swap to the overlay on the next paint — better than
  // showing a flash of "we'll be back" before we know if it's needed.
  if (!loading && !isEnabled(FLAG_KEYS.MAINTENANCE)) {
    return <>{children}</>;
  }
  if (loading) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <PageTitle title="Maintenance — back soon" />
      <div className="max-w-sm text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-warning-surface">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          We&apos;ll be back in a few minutes
        </h1>
        <p className="text-sm text-dim leading-relaxed">
          Livong is briefly down for maintenance. Your matches and chats are safe — this page will refresh automatically when we&apos;re ready.
        </p>
        <p className="text-[11px] text-faint mt-4">Auto-checking every 30 seconds…</p>
      </div>
    </div>
  );
}
