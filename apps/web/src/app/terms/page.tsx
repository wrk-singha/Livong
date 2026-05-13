"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-10 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-dim hover:text-secondary inline-flex items-center gap-1 mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-2">Terms of Service</h1>
        <div className="mb-8 p-3 bg-warning-surface border border-warning rounded-lg text-xs text-warning">
          <p className="font-semibold">⚠️ Pre-launch draft — not yet legally binding.</p>
          <p className="mt-1 text-secondary leading-relaxed">
            These terms are a working document. They will be reviewed by legal counsel and updated before public launch. By using Livong during this preview period, you accept our intent in good faith, not these specific terms as a contract.
          </p>
        </div>

        <div className="space-y-6 text-sm text-secondary leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Using Livong</h2>
            <p>Livong helps you find roommates and shared-living arrangements. You must be 18+ to use the service. By using Livong you agree to keep your account details accurate and to interact respectfully with other users.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">What you must not do</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Post fake or misleading listings.</li>
              <li>Harass, threaten, or discriminate against other users.</li>
              <li>Ask for money before in-person property viewings.</li>
              <li>Solicit users for activities outside the scope of finding a place to live.</li>
              <li>Scrape, automate, or attempt to break the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Money & rent</h2>
            <p>Livong helps groups track rent splits. We don't collect or hold payments. Any money exchanged between users is between them. Disputes about rent should be resolved between the parties involved.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Account suspension</h2>
            <p>We may suspend accounts that violate these terms, especially for harassment or fraud reports. We may share information with law enforcement when legally required.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">No warranty</h2>
            <p>Livong is provided as-is. We can't guarantee any match or listing is what it claims to be — always verify in person and meet first in public. See <Link href="/privacy" className="text-accent underline">our privacy policy</Link> for what we do with your data.</p>
          </section>

          <p className="text-xs text-muted pt-4 border-t border-border">
            This is a draft for an MVP. Get reviewed by a lawyer before any public launch.
          </p>
        </div>
      </div>
    </div>
  );
}
