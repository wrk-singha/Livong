"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-10 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-dim hover:text-secondary inline-flex items-center gap-1 mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <div className="mb-8 p-3 bg-warning-surface border border-warning rounded-lg text-xs text-warning">
          <p className="font-semibold">⚠️ Pre-launch draft — not yet legally binding.</p>
          <p className="mt-1 text-secondary leading-relaxed">
            This policy is a working document. It will be reviewed by legal counsel and updated before public launch. Until then, treat this as an honest description of our intent, not a contract. For questions: <a className="text-accent underline" href="mailto:hello@livong.app">hello@livong.app</a>.
          </p>
        </div>

        <div className="space-y-6 text-sm text-secondary leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">What we collect</h2>
            <p>Phone number for sign-in (verified via OTP). Profile info you choose to share — name, age, gender, location, lifestyle preferences, photo. Listings you create. Messages you send. Rent group activity if you use it.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">What we don't do</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Sell your data to third parties.</li>
              <li>Share your phone number until you choose to share it with a match.</li>
              <li>Show ads inside Livong.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Your rights (DPDP Act 2023)</h2>
            <p>You can request access to, correction of, or deletion of your data at any time. Account deletion is self-serve from your <Link href="/profile" className="text-accent underline">Profile</Link> page and removes your PII immediately. Some anonymised records (e.g. message metadata) are retained for safety/audit per Section 8(7).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Security</h2>
            <p>Phone OTPs are hashed before storage. JWTs sign authenticated requests over HTTPS in production. We do not store passwords.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
            <p>Questions, concerns, or data requests: <a className="text-accent underline" href="mailto:hello@livong.app">hello@livong.app</a>.</p>
          </section>

          <p className="text-xs text-muted pt-4 border-t border-border">
            This is a draft policy for an MVP. Get this reviewed by a lawyer before any public launch.
          </p>
        </div>
      </div>
    </div>
  );
}
