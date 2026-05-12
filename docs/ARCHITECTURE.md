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
│   │   ├── main.go           # Entry point
│   │   ├── internal/
│   │   │   ├── auth/         # Login, OTP, JWT
│   │   │   ├── user/         # Profile CRUD
│   │   │   ├── listing/      # Listing CRUD + filters
│   │   │   ├── interest/     # Send/accept/reject interests
│   │   │   ├── match/        # Auto-created on accept
│   │   │   ├── chat/         # Messages + contact sharing
│   │   │   ├── review/       # Listing reviews
│   │   │   ├── plan/         # Subscription plans
│   │   │   ├── rent/         # Rent groups, payments, commissions
│   │   │   ├── database/     # Connection + inline migrations
│   │   │   └── middleware/    # JWT auth middleware
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
│           │   ├── login/            # Phone + OTP login
│           │   ├── profile/          # View + setup
│           │   ├── explore/          # Browse listings
│           │   ├── listings/[id]/    # Listing detail
│           │   ├── create-listing/   # Post a listing
│           │   ├── matches/          # Matched users
│           │   ├── rent/             # Rent dashboard + group details
│           │   └── chat/[matchId]/   # 1:1 chat
│           ├── components/   # AppShell, ServiceWorkerRegistrar
│           ├── contexts/     # AuthContext, ThemeContext
│           └── lib/          # API client, types, constants
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
| `auth` | Phone login, OTP generation (in-memory, no SMS yet), JWT token issuance |
| `user` | Profile create, read, partial update |
| `listing` | CRUD, filter by location (ILIKE) and budget range |
| `interest` | Send interest, accept/reject, duplicate prevention |
| `match` | Auto-created when interest is accepted |
| `chat` | Text messages, contact sharing (phone/email as special message type) |
| `rent` | Rent groups, member splits, payment verification, broker commissions |
| `database` | PostgreSQL connection, inline `CREATE TABLE IF NOT EXISTS` migrations |
| `middleware` | JWT extraction and user ID injection into context |

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
- WebSocket real-time chat
