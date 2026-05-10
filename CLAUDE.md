# Livong

Roommate / shared-living platform. Monorepo: Go backend + Next.js frontend + PostgreSQL.

## Read first

Project rules live in `.cursorrules` — **read it before any code change**. It defines hard constraints (no ORMs, no UI libs, theme tokens, pnpm only, etc.) that this project depends on.

## Layout

```
apps/backend/         Go 1.26, Gin, raw SQL, JWT  (:8080)
apps/admin-backend/   Admin API, separate Go module (:8081)
apps/web/             Next.js 16, React 19, TS, Tailwind v4 (:3000)
apps/admin/           Admin panel Next.js (:3100)
docs/                 PRD, architecture, API, DB schema
cli.mjs               Cross-platform dev CLI (entry: ./livong)
```

## Running things

Always prefer the CLI over raw commands:

```
./livong start           # backend + web
./livong status          # what's running
./livong server:start    # just backend
./livong web:dev         # just frontend
./livong admin:dev       # admin panel
./livong fresh           # clean + install + start
```

## When making changes

- Frontend changes → check theme tokens (no `dark:`, no hex, no `text-neutral-*` for theming)
- Backend handler → register route in `main.go`, follow handler-per-feature pattern
- DB schema change → append migration to `internal/database/migrations.go`
- API surface change → update `docs/api.md`
- Architecture/schema change → update relevant `docs/`

## Don't

- Add dependencies without asking
- Introduce new top-level directories
- Use `npm`/`yarn` (pnpm only)
- Write comments unless logic is non-obvious
