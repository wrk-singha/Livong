# Safety & Trust Roadmap

What ships before public launch. Carved out of the trust/safety audit on 2026-05-11.

## ✅ Shipped (this PR)

- [x] **Account deletion** — `DELETE /account` + UI in `/profile`. DPDP Act 2023 §12 compliance.
- [x] **Removed fake "Verified" badge** — `users.is_verified` no longer returned by listing API. Re-add when real verification ships.
- [x] **Safety messaging on share-contact** — checklist appears in modal: meet in public, never share OTPs, etc.
- [x] **Surface money/messaging errors** — silent failures fixed in `/rent/[id]` and `/chat/[matchId]`.
- [x] **Privacy + Terms pages** — placeholder content, must be lawyer-reviewed before launch.
- [x] **Footer with legal links** — Privacy / Terms / Contact reachable from home.
- [x] **Tokens reject deleted users** — middleware switched to `AuthWithDB` so a stale token from another device is rejected after deletion.

## 🔴 Must ship before any public launch

### Reporting (1-2 days)
- [ ] DB: `reports` table (reporter_id, target_type [listing|profile|message], target_id, reason enum, free_text, created_at, status)
- [ ] Backend: `POST /reports` route, `internal/report/handler.go`
- [ ] UI: kebab menu on chat bubbles → "Report message"
- [ ] UI: "Report" button on listing detail
- [ ] UI: "Report" on profile pages
- [ ] Admin: queue at `apps/admin/app/reports/page.tsx` with resolve/dismiss

### Blocking (1-2 days)
- [ ] DB: `user_blocks` table (blocker_id, blocked_id UNIQUE pair, created_at)
- [ ] Backend: filter `chat/handler.go` SendMessage and GetMessages to NOT EXISTS block-pair check
- [ ] Backend: filter `match/handler.go` and `listing/handler.go` to exclude blocks both ways
- [ ] UI: "Block & Report" combo in chat header, profile detail
- [ ] Settings page: list of blocked users with unblock action

### Photo / ID Verification (3-5 days, real provider integration)
- [ ] Pick provider — Hyperverge or Digio for India (Aadhaar masked, DigiLocker, selfie liveness)
- [ ] DB: `verifications` table (user_id, type, provider_ref, status, verified_at)
- [ ] Backend: webhook handler for verification result
- [ ] UI: "Get verified" CTA in profile
- [ ] Re-add `ownerVerified` to API response, render `VerifiedBadge` only when verified=true
- [ ] Tooltip explaining what "Verified" actually means

## 🟡 Should ship before scaling beyond ~100 users

### Content moderation
- [ ] Profanity / abuse filter on listing descriptions, profile fields, messages
- [ ] PII scrub on messages (numbers, emails) for safety + to discourage moving off-platform too early
- [ ] Admin moderation tools — view a chat thread, suspend a user, take down a listing

### Audit trail
- [ ] IP + user-agent on auth events (`auth_logs` table)
- [ ] Edit/delete history for messages
- [ ] Admin: per-user activity timeline for incident review

### Privacy controls
- [ ] "Show my profile only after I accept interest" toggle
- [ ] "Hide my listing from broker accounts" toggle
- [ ] Default visibility settings on profile setup

## ⚙️ Cross-cutting infra

- [ ] Email (or WhatsApp) channel — once we collect emails, we owe users a way to communicate non-app-resident notifications (deletion confirmation, reports filed, suspension notices)
- [ ] OTP via Twilio / MSG91 for India in production (currently OTPs print to backend stdout)
- [ ] Sentry + structured error logs so safety bugs don't go unnoticed in prod

## Decision log

- **Why soft-delete instead of hard-delete:** safety. A user who deletes during an active harassment incident still leaves anonymised message records the admin can show police. Per DPDP §8(7), retention for legal/safety is allowed.
- **Why not require photo verification at signup:** kills onboarding conversion for an MVP. Optional badge is the right starting point.
- **Why "Verified" badge was removed entirely:** showing a green tick that doesn't mean anything is worse than no badge. Add back when wired to a real check.
