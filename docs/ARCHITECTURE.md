# Livong Architecture

## Overview

Livong is a roommate/shared-living platform. Users sign up, create a profile, post or browse listings, express interest, match, chat, and manage shared rent payments. Brokers can also create standalone rent groups and apply a configurable commission model.

The system is a monorepo with a Go backend and Next.js frontend, both talking to PostgreSQL.

```
Frontend (Next.js)  →  REST API (Go/Gin)  →  PostgreSQL
```

---

## Project Structure

```
Livong/
├── apps/
│   ├── backend/              # Go API server (:6980)
│   │   ├── main.go           # Entry point — wires hub + ticket store + routes
│   │   ├── cmd/
│   │   │   └── seed/         # `go run ./cmd/seed` — idempotent test data
│   │   ├── internal/
│   │   │   ├── auth/         # Login, OTP, JWT, dev-login bypass
│   │   │   ├── user/         # Profile CRUD + avatar upload + account delete
│   │   │   ├── listing/      # Listing CRUD + image upload + filters
│   │   │   ├── pg/           # PG-specific details (sharing type, meals, etc.)
│   │   │   ├── interest/     # Send/accept/reject interests
│   │   │   ├── match/        # Auto-created on accept
│   │   │   ├── chat/         # Messages + contact sharing + hub.Broadcast on send
│   │   │   ├── ws/           # WebSocket hub, ticket store, accept handler
│   │   │   ├── report/       # User-submitted abuse reports
│   │   │   ├── block/        # User → user blocks (filters chat both directions)
│   │   │   ├── review/       # Listing reviews
│   │   │   ├── plan/         # Subscription plans
│   │   │   ├── rent/         # Rent groups, payments, commissions
│   │   │   ├── seed/         # Seed data (5 users + 4 listings + match + 5 msgs)
│   │   │   ├── database/     # Connection + inline migrations
│   │   │   └── middleware/   # JWT auth middleware (DB-aware: rejects deleted users)
│   │   ├── go.mod
│   │   └── go.sum
│   ├── admin-backend/        # Admin API server (:6981, independent Go module)
│   │   ├── main.go           # Entry point
│   │   ├── internal/
│   │   │   ├── admin/        # Admin endpoints (stats, CRUD, revenue, analytics)
│   │   │   ├── auth/         # Login, OTP, JWT (own copy)
│   │   │   ├── database/     # Connection + migrations (own copy)
│   │   │   └── middleware/    # JWT auth + CORS (own copy)
│   │   ├── go.mod
│   │   └── go.sum
│   ├── admin/                # Admin panel (Next.js, :6910)
│   └── web/                  # Next.js frontend (:6900)
│       └── src/
│           ├── app/          # Pages (App Router)
│           │   ├── page.tsx          # Landing
│           │   ├── login/            # Phone + OTP login, resend cooldown
│           │   ├── profile/          # Edit (redirects to setup if no profile)
│           │   ├── profile/setup/    # First-time profile + welcome screen
│           │   ├── explore/          # Browse listings
│           │   ├── listings/[id]/    # Listing detail
│           │   ├── create-listing/   # Post a listing
│           │   ├── matches/          # Matched users + interest inbox
│           │   ├── rent/             # Rent dashboard + group details
│           │   ├── plans/            # Subscription plans
│           │   ├── privacy/          # Privacy policy (DPDP draft)
│           │   ├── terms/            # Terms of service (DPDP draft)
│           │   └── chat/[matchId]/   # 1:1 chat (WS-first, polling fallback)
│           ├── components/   # AppShell, ServiceWorkerRegistrar,
│           │                 # ConsentBanner, ReportModal, ui/*
│           ├── contexts/     # AuthContext, ThemeContext, ProfileContext
│           └── lib/          # api.ts, ws.ts, useChatStream.ts, PageTitle.tsx,
│                             # types.ts, query.ts (React Query setup)
├── docs/                     # PRD, Architecture, API, DB Schema
├── cli.mjs                   # Cross-platform dev CLI (Node.js)
├── livong                    # macOS/Linux launcher
├── livong.bat                # Windows launcher
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, App Router |
| Backend | Go 1.26, Gin v1.12, lib/pq |
| Auth | JWT (golang-jwt/jwt/v5), HS256, 7-day expiry |
| Database | PostgreSQL 16 |
| Package Manager | pnpm |
| Dev Tooling | Node.js CLI (cli.mjs) |

---

## Backend Modules

Each module in `internal/` owns its handler, routes, and queries:

| Module | Responsibility |
|--------|---------------|
| `auth` | Phone login, OTP generation (in-memory, no SMS yet), JWT token issuance, dev-login bypass behind `LIVONG_DEV_LOGIN=1` |
| `user` | Profile create, read, partial update, avatar upload, DPDP §12 account delete |
| `listing` | CRUD, filter by location (ILIKE) and budget range, image upload |
| `pg` | Paying-guest specific details (sharing type, meals, gender preference) upserted per listing |
| `interest` | Send interest, accept/reject, status-aware duplicate prevention, owner inbox |
| `match` | Auto-created when interest is accepted |
| `chat` | Text messages, contact sharing, `hub.Broadcast` on send/share for real-time push |
| `ws` | In-process WebSocket hub, single-use ticket store, accept handler (auth via ticket) |
| `report` | User-submitted abuse reports (enum reasons, free-text detail, admin queue) |
| `block` | User→user blocks; chat handler filters messages both directions |
| `review` | Listing reviews + ratings |
| `plan` | Subscription plans (free / basic / pro) |
| `rent` | Rent groups, member splits, payment verification, broker commissions |
| `database` | PostgreSQL connection, inline `CREATE TABLE IF NOT EXISTS` migrations |
| `middleware` | JWT extraction + user ID injection. `AuthWithDB` also rejects deleted users so stale tokens can't outlive an account delete |

---

## Data Flow

### Interest → Match → Chat

```
User A sends interest on User B's listing
  → Backend stores interest (status: pending)
    → User B accepts interest
      → Backend creates match (user1_id, user2_id, listing_id)
        → Chat enabled between A and B
          → Either user can share contact info
```

### Rent Tracking Flow

```
Creator or broker creates a rent group
  → Members are added with share amounts
    → Each member records payment for a month
      → Counterparty verifies the payment
        → If all month payments are verified, broker commission is auto-created
          → Broker can mark commission as collected
```

---

## Authentication

```
POST /auth/login     { phone }     → OTP generated (returned in dev, SMS in prod)
POST /auth/verify-otp { phone, otp } → JWT token returned
All other routes     Authorization: Bearer <token>
```

OTP is stored in-memory (Go map). JWT uses `JWT_SECRET` env var with a hardcoded dev fallback.

---

## Real-time (WebSocket)

Chat uses a WebSocket to push *invalidation events*; the client refetches via the existing REST endpoint when it sees one. Falls back to 5s polling if the WS can't connect, stretches to 60s heartbeat when it can.

### Why invalidation, not data
Pushing `{ type: "invalidate", entity: ["messages", matchId] }` instead of the message payload keeps REST as the single source of truth. The TanStack Query cache refetches via the same `GET /messages/:matchId` it always used, so any in-flight refetch can't lose to a pushed-data race. Pattern from [TkDodo](https://tkdodo.eu/blog/using-web-sockets-with-react-query) (TanStack Query maintainer).

### Auth flow
Browsers can't set `Authorization` on a WebSocket open, and bare JWTs in URLs leak via referrers and proxy logs. So:

```
1. Client → POST /chat/ws-ticket   (with normal Bearer JWT)
2. Server → { ticket: <32 hex>, expiresIn: 30 }   (in-memory store, single use)
3. Client → GET  /chat/ws?ticket=<token>   (no auth header)
4. Server → validates + redeems ticket, then websocket.Accept
```

After accept, the connection knows the user ID. Subscribe authz is enforced at subscribe time, not broadcast time:

```
Client → { type: "subscribe", topic: "messages:<matchId>" }
Server → checks user is in that match. If not, sends { type: "error", entity: ["subscribe-denied", topic] } and ignores.
```

### Backend (`internal/ws/`)
- `hub.go` — `topics map[string]map[*Client]struct{}` + RWMutex. `Broadcast` snapshots the recipient list under the read lock so a slow consumer can't block the producer; dropped events reconcile via the next REST refetch on the client side.
- `client.go` — per-conn read pump + writer goroutine with a 25s ping, 10s write timeout, buffered send channel that drops on full.
- `ticket.go` — single-use, 30s TTL, in-memory; periodic GC every 60s.
- `handler.go` — `POST /chat/ws-ticket` (behind JWT middleware) + `GET /chat/ws?ticket=` (no middleware, ticket IS the auth).

### Migration path for multi-VM
Today's in-process broadcast handles thousands of connections on one Fly VM. When VM #2 lands, replace the in-handler `hub.Broadcast(...)` call with `pg_notify('livong_event', json)` and add a single goroutine in `internal/ws/` running `LISTEN livong_event` on a dedicated `*sql.Conn` that fans into `hub.Broadcast`. Each VM listens, each fans out to its own connections. No API surface change, ~3 files touched.

Skip Redis until LISTEN/NOTIFY actually bottlenecks (>1k notifies/sec sustained) or you need TTL'd presence/typing indicators.

### Frontend (`lib/ws.ts`, `lib/useChatStream.ts`)
Singleton `partysocket.ReconnectingWebSocket` with a ticket-on-reconnect URL provider (each reconnect mints a fresh ticket via REST). The `useChatStream(matchId, onInvalidate)` hook subscribes to `messages:<matchId>` on mount, surfaces a `connected` flag the chat page uses to stretch the polling interval to 60s.

### CSP gotcha (real bug we hit)
`connect-src` requires the scheme to match. `http://host` does NOT cover `ws://host`. Prod CSP in `next.config.ts` derives `wsOrigin` from `apiOrigin` (http→ws, https→wss) and includes both:
```
connect-src 'self' ${apiOrigin} ${wsOrigin}
```
Without this, real-time chat silently falls back to polling in production with only a browser-DevTools-visible CSP violation.

---

## Frontend Architecture

- **App Router** with layout wrapping all authenticated pages in `AppShell`
- **AuthContext** — loads JWT from localStorage in `useEffect`, exposes `hydrated` flag to prevent SSR mismatch
- **ThemeContext** — dark/light mode with system preference detection, localStorage persistence, `.dark` class on `<html>`. Colors are centralized in `globals.css` as CSS variables (31 tokens in `:root` / `.dark`), registered in `@theme inline` as Tailwind utilities (`bg-surface`, `text-foreground`, `border-border`, etc.). Components use semantic token classes — no scattered `dark:` prefixes.
- **API client** (`lib/api.ts`) — typed methods for every endpoint, auto-attaches JWT
- **PWA** — service worker, manifest, installable on mobile
- **Responsive** — desktop sidebar nav + mobile bottom nav (both in `AppShell`)
- **Design** — minimal clean aesthetic (neutral palette, solid backgrounds, no glassmorphism)

---

## Environment Variables

**Backend:**
- `PORT` — server port (default: 6980)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key

**Frontend:**
- `NEXT_PUBLIC_API_URL` — backend URL (default: http://localhost:6980)

---

## Deployment (Planned)

| Component | Target |
|-----------|--------|
| Frontend | Vercel |
| Backend | VPS |
| Database | Managed PostgreSQL |
| Domain | livong.app / api.livong.app |

---

## Not Yet Implemented

These are documented in the PRD as future work but have no code:

- Identity verification (video selfie, KYC documents)
- Location/maps (geocoding, lat/lng on listings, radius search)
- AI facilities agent
- Smart matching / compatibility scoring
- Real SMS OTP delivery (currently stdout-logs the code; MSG91 integration pending)
