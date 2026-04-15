# Livong — Project Rules

Livong is a roommate/shared-living platform. Go backend + Next.js frontend + PostgreSQL. Monorepo under `apps/`.

## Architecture

```
apps/backend/        → Go API (Gin, raw SQL, JWT auth, :8080)
apps/admin-backend/  → Admin API (Go, independent module, :8081)
apps/web/            → Next.js 16 frontend (React 19, TypeScript, Tailwind v4, App Router, :3000)
apps/admin/          → Admin panel (Next.js, :3100)
docs/                → PRD, Architecture, API, DB Schema
```

Do not create new top-level directories. Do not add ORMs, UI component libraries (shadcn, Chakra, etc.), or state management libraries (Redux, Zustand). This project uses raw SQL, raw Tailwind, and React Context.

## Centralized Theme System (CRITICAL)

All colors are defined as CSS variables in `apps/web/src/app/globals.css`. Components use semantic Tailwind classes — **never hardcode colors or use `dark:` prefixes**.

### How it works

1. `:root` defines light-mode CSS variables (`--surface`, `--foreground`, `--border`, etc.)
2. `.dark` overrides those same variables with dark-mode values
3. `@theme inline` registers them as Tailwind utilities (`bg-surface`, `text-foreground`, `border-border`)
4. ThemeContext toggles `.dark` class on `<html>` — all colors switch automatically

### Token reference

| Token | Use for | Tailwind class examples |
|-------|---------|------------------------|
| `background` | Page background | `bg-background` |
| `foreground` | Headings, primary text | `text-foreground` |
| `primary` | Buttons, active states | `bg-primary`, `text-primary` |
| `surface` | Cards, panels, inputs | `bg-surface` |
| `surface-alt` | Recessed areas, alt backgrounds | `bg-surface-alt` |
| `secondary` | Body text, descriptions | `text-secondary` |
| `muted` | Labels, meta text | `text-muted` |
| `dim` | Timestamps, subtle text | `text-dim` |
| `faint` | Placeholders, decorative | `text-faint` |
| `border` | Standard borders | `border-border` |
| `border-light` | Subtle borders | `border-border-light` |
| `error` / `error-surface` / `error-border` | Error states | `text-error`, `bg-error-surface` |
| `success-text` / `success-surface` | Success states | `text-success-text`, `bg-success-surface` |
| `warning` / `warning-surface` | Warning states | `text-warning`, `bg-warning-surface` |
| `info` / `info-surface` | Info states | `text-info`, `bg-info-surface` |

### Rules

- **NEVER** use `dark:` prefix classes (e.g., `dark:bg-neutral-900`)
- **NEVER** hardcode hex colors in className or inline styles
- **NEVER** use raw Tailwind neutrals for theming (e.g., `text-neutral-500` for body text) — use the semantic token instead (`text-muted`)
- Raw neutrals are ONLY acceptable for intentionally fixed elements (avatar backgrounds like `bg-neutral-900 text-white`)
- SVG icons use `stroke="currentColor"` and inherit color from parent's text class
- To add a new color: add to `:root`, `.dark`, AND `@theme inline` in globals.css

## Frontend Conventions

### Component structure

```tsx
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth"
import { api } from "@/lib/api"
import type { Listing } from "@/lib/types"

export default function PageName() {
  const { token, userId } = useAuth()
  const [data, setData] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getListings()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  return <div className="page-container py-6">...</div>
}
```

### Rules

- All pages are client components (`"use client"`)
- Use `@/` path alias for imports (maps to `src/`)
- Types go in `lib/types.ts`, constants in `lib/constants.ts`, API methods in `lib/api.ts`
- All API calls go through `lib/api.ts` — never use `fetch()` directly in components
- Constants use `as const` for type narrowing
- Default exports for page components, named exports for everything else
- No external UI libraries — use Tailwind + the utility classes in globals.css (`.btn-primary`, `.card`, `.input`)
- Use reusable UI components from `@/components/ui` (Button, Input, TextArea, Select, Alert, Modal, Spinner, PageSpinner, EmptyState, Avatar, Badge, Skeleton, BackButton, VerifiedBadge, StarRatingDisplay, StarRatingPicker)
- Data fetching: use TanStack Query (`useQuery` for reads, `useMutation` for writes) — not raw `useEffect` + `useState` for API calls
- Navigation lives in `AppShell.tsx` — sidebar on desktop, bottom nav on mobile
- Auth state uses `useAuth()` hook with `hydrated` flag to prevent SSR flicker
- Profile state uses `useProfile()` hook — returns `{ profile, loading, hasProfile, setProfile, clearProfile }`
- Theme state uses `useTheme()` hook — never read theme from DOM directly
- Inline SVGs for icons (no icon library) — use `currentColor` for strokes
- Responsive: mobile-first, use `md:` and `lg:` breakpoints
- Animations: use the CSS classes from globals.css (`.animate-fade-in-up`, `.animate-slide-in`, `.stagger`)
- Page widths: main pages use `max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto`, forms use `max-w-sm md:max-w-lg lg:max-w-xl mx-auto`

## Backend Conventions

### Handler pattern

```go
package feature

import (
    "database/sql"
    "net/http"
    "github.com/gin-gonic/gin"
)

type Handler struct {
    db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
    return &Handler{db: db}
}

func (h *Handler) Create(c *gin.Context) {
    userId := c.GetString("userId") // from auth middleware

    var req struct {
        Title string `json:"title" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

    var id string
    err := h.db.QueryRow(`INSERT INTO things (user_id, title) VALUES ($1, $2) RETURNING id`, userId, req.Title).Scan(&id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"id": id})
}
```

### Rules

- One handler file per feature: `internal/{feature}/handler.go`
- Handler struct holds `*sql.DB`, created via `NewHandler(db)`
- Register routes in `main.go` — public vs protected groups
- Use `c.ShouldBindJSON()` for request parsing with inline structs
- Use `gin.H{}` for all JSON responses
- Raw SQL with parameterized queries (`$1`, `$2`) — no ORM
- Database columns: `snake_case`. JSON fields: `camelCase`
- Tables: plural (`users`, `listings`, `matches`)
- UUIDs for primary keys: `DEFAULT gen_random_uuid()`
- Timestamps: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Auth: JWT with Bearer token, user ID injected via middleware into `c.Set("userId", ...)`
- Migrations: inline in `internal/database/migrations.go` using `CREATE TABLE IF NOT EXISTS`
- Error responses: `gin.H{"error": "Human-readable message"}`

## General Rules

- Package manager: `pnpm` (not npm or yarn)
- Dev CLI: `node cli.mjs start|stop|status|fresh`
- Backend port: 8080, Admin backend port: 8081, Frontend port: 3000, Admin port: 3100
- No unnecessary abstractions — keep it simple and direct
- No docstrings or comments unless logic is non-obvious
- Do not add dependencies without asking — the stack is intentionally minimal
- When modifying the theme, update `:root`, `.dark`, AND `@theme inline` together
- Keep docs/ updated if you change architecture, API endpoints, or DB schema

## Security (already implemented)

- OTPs are SHA-256 hashed before storage — never stored or returned in plaintext
- OTP in dev: printed to Go server terminal via `fmt.Printf("[DEV] OTP for %s: %s\n", phone, otp)`
- Login rate limiting: 3 OTP requests per 15 min per phone number
- Verify rate limiting: 5 attempts per 15 min per phone number
- Phone validation: `^\+?[1-9]\d{6,14}$` regex
- Input length limits: name ≤100, description ≤5000, message ≤2000, location ≤200, title ≤200, rent 0–10M, age 18–120
- JWT: HS256, 7-day expiry, iss/aud claims (main: `livong`/`livong-api`, admin: `livong-admin`/`livong-admin-api`)
- Security headers on all backends: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP, X-DNS-Prefetch-Control, X-Download-Options, X-XSS-Protection:0
- CSP on frontends via `next.config.ts` headers()
- CORS restricted to specific origins (`CORS_ORIGINS` env)
- Image uploads: content-type sniffing via `http.DetectContentType`, max 5MB, extensions `.jpg/.jpeg/.png/.webp`
- Auth: Bearer token in Authorization header (not cookies) — CSRF not needed
