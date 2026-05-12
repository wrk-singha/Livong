# Livong

Roommate / shared-living platform. Monorepo: Go backend + Next.js frontend + PostgreSQL.

## Read first

- `.cursorrules` — hard constraints + code skeletons + decision tree. **Read before any code change.**
- `docs/ai-workflow.md` — how AI tools are wired up here (slash commands, permissions, phone workflow, what was already done).

## Layout

```
apps/backend/         Go 1.26, Gin, raw SQL, JWT  (:6980)
apps/admin-backend/   Admin API, separate Go module (:6981)
apps/web/             Next.js 16, React 19, TS, Tailwind v4 (:6900)
apps/admin/           Admin panel Next.js (:6910)
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
./livong test            # run all tests (Go + Playwright)
./livong test:backend    # Go tests only
./livong test:web        # Playwright e2e only
```

## Authenticated Playwright tests

`apps/web/e2e/authed.spec.ts` covers logged-in flows. They auto-skip if the backend isn't running with the dev-login bypass enabled.

To run them:
```
LIVONG_DEV_LOGIN=1 ./livong server:start
./livong test:web
```

The dev-login route (`POST /auth/_dev-login`) is gated behind `LIVONG_DEV_LOGIN=1` and refuses to load if `APP_ENV=production` or `NODE_ENV=production`. **Never enable in production.**

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
