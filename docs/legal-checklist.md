# Legal Review Checklist

What a lawyer needs to evaluate before Livong is shared publicly. Hand this to whoever you retain — every section is a real question someone could be sued or fined over if the answer is wrong.

> The pages live at `apps/web/src/app/privacy/page.tsx` and `apps/web/src/app/terms/page.tsx`. They're explicitly marked as drafts.

---

## DPDP Act 2023 (Digital Personal Data Protection — India)

This is the binding law. Penalties up to ₹250 crore per violation.

| § | Topic | What we say / do | Lawyer should confirm |
|---|---|---|---|
| 4 | Lawful basis for processing | Implicit consent at signup (phone OTP) | Is implicit consent enough for "necessary" processing? Do we need an explicit consent step? |
| 5 | Notice to Data Principal | `/privacy` page lists categories | Notice quality — is it specific enough? Should it be served at signup, not just linked in footer? |
| 6 | Consent | OTP signup = consent? | When user accepts ToS via "Continue" button — is that affirmative? Do we need a checkbox? |
| 8(7) | Retention limits | Soft-delete keeps anonymized rows | Are anonymized message records "personal data" if reversible? |
| 11 | Right to access/correction | Profile edit page | Is there a way to *request a copy* of all data? (Currently no — only edit.) |
| 12 | Right to erasure | `DELETE /account` + UI | Confirmed implemented. Lawyer to verify scope is sufficient (we keep tombstoned phone for FK; is that "erasure"?) |
| 16 | Cross-border transfer | Hosting on Fly.io Mumbai + Neon Singapore | Is Singapore in the negative-list? (Last check: not on the negative list as of 2026, but verify.) |
| 17 | Significant Data Fiduciary | Probably not us at <50K users | Confirm threshold and prepare for it before scaling |
| 27 | Grievance redressal | `mailto:hello@livong.app` in footer | Is a single email enough? Spec asks for "easily accessible means" — should we add an in-app form? |

## Consent UI gaps to fix BEFORE launch

- [ ] **Cookie / tracking banner** — DPDP requires consent for non-essential data collection. Sentry + PostHog count. Either add a banner or document why we don't (no third-party tracking on landing today, only after auth).
- [ ] **ToS acceptance checkbox** at signup — current flow doesn't require explicit acceptance. Risk: user can claim they never agreed.
- [ ] **Age gate** — terms say 18+ but we don't verify. Self-attestation checkbox at signup is the minimum.
- [ ] **Marketing consent** separate from product consent — if we ever email beyond transactional, this matters.

## India-specific business law

| Topic | Status | Lawyer review needed |
|---|---|---|
| **Intermediary status** | We host user content | IT Rules 2021 compliance — grievance officer, takedown response time |
| **Real estate brokerage law** | We do NOT charge for matchmaking; broker tier collects rent commission *between users* | Are we a "real estate intermediary" under any state RERA? Do we need to register? |
| **Payment intermediary** | We don't hold payments today | If/when we add Razorpay subscriptions, GST registration + payment aggregator rules apply |
| **Money laundering (PMLA)** | N/A today | Becomes relevant when we facilitate money flows |
| **GST** | Below ₹20L threshold | Track and register at threshold |

## Specific text to scrutinize

### `/privacy` 
- "We don't sell your data" — defensible? (Yes today, but if we ever do analytics partnerships, need to update.)
- "Your contact info stays hidden until you choose to share" — is this technically true after the share-contact flow? Once shared, can we recall it?
- Retention period not specified — DPDP needs a stated retention policy.

### `/terms`
- "You must be 18+" — no enforcement today. Must add attestation checkbox.
- "Disputes about rent should be resolved between the parties involved" — does this fully limit our liability if a roommate scams another? Probably not — review with lawyer.
- "We may share information with law enforcement when legally required" — should specify the standard (warrant? subpoena?). Vague invites criticism.
- "We may suspend accounts" — do we owe a process? Notice period? Right to appeal?

## Specific safety claims we make in product

- **"Livong staff will never ask for your OTP"** — appears in `apps/web/src/app/chat/[matchId]/page.tsx` share-contact modal. ✅ True, defensible.
- **"Reports are reviewed by Livong staff. False reports may result in account action against the reporter"** — appears in `apps/web/src/components/ReportModal.tsx`. ⚠️ Lawyer: is "account action" too vague? Could a banned user sue for ambiguity?
- **"Verified" badge** — currently REMOVED from frontend (we deleted it because it was fake). Re-add only when wired to a real verification provider. Otherwise we make false trade representations.

## Things to ask the lawyer explicitly

1. **Can we launch publicly without RERA registration in any state?** Specifically Karnataka and Telangana (where the seeded listings are).
2. **Is our soft-delete sufficient under DPDP §12?** We tombstone the phone column with a sentinel and scrub PII fields, but the user_id row still exists.
3. **Do we need to register as an Intermediary under IT Rules 2021?**
4. **Can we use the name "Livong" or do we need a trademark search first?**
5. **Indemnification clauses** — what's appropriate for a roommate-matching service in India?

## Cost estimate to get this right

- **Bare minimum:** 1 hour of a startup lawyer's time (~₹5–15K) to review the two pages + answer the 5 questions above
- **Recommended:** 3-4 hours including drafting RAW (Right Approach to Withdraw consent) flows + IT Rules compliance memo (~₹15–40K)
- **Long-term:** Annual retainer once you have users (~₹10K/mo). Most India SaaS startups do this.

## What NOT to do

- **Don't launch without doing the legal review.** "We're small, no one will sue" is true until someone does.
- **Don't copy-paste another startup's privacy policy.** Their context isn't yours.
- **Don't claim DPDP compliance until a lawyer signs off.** False claims are themselves a violation.

---

Last updated: as of session work (placeholder values throughout). Refresh this file every legal change.
