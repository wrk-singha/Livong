# Livong

A roommate and shared-living platform. Find compatible people, discover rooms, connect and chat.

## Structure

```
apps/
  backend/         Go API (Gin + PostgreSQL, :6980)
  admin-backend/   Admin API (Go, independent module, :6981)
  web/             Next.js frontend (TypeScript + Tailwind CSS v4, :6900)
  admin/           Admin panel (Next.js, :6910)

docs/              Documentation (PRD, Architecture, API, DB Schema)
cli.mjs            Cross-platform dev CLI
```

## Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- pnpm

### Quick Start

Use the interactive CLI:

```bash
# macOS / Linux
./livong

# Windows
livong.bat
```

Or run commands directly:

```bash
./livong start        # Start backend + frontend
./livong stop         # Stop everything
./livong status       # Show what's running
./livong fresh        # Clean + install + start all
```

### Manual Setup

**Backend:**
```bash
cd apps/backend
DATABASE_URL="postgres://user@localhost:5432/livong?sslmode=disable" \
JWT_SECRET="your-secret" \
go run main.go
```

**Frontend:**
```bash
cd apps/web
pnpm install
pnpm dev
```

### Environment Variables

**Backend** (`apps/backend/.env`):
- `PORT` — Server port (default: 6980)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key

**Frontend** (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default: http://localhost:6980)

## CLI Commands

```bash
./livong server:start         # Start Go backend (:6980)
./livong server:stop          # Stop backend
./livong admin-server:start   # Start admin backend (:6981)
./livong admin-server:stop    # Stop admin backend
./livong web:dev              # Start Next.js dev server (:6900)
./livong web:stop             # Stop frontend
./livong web:build            # Production build
./livong web:clean            # Clear .next cache
./livong web:install          # Install pnpm dependencies
./livong admin:dev            # Start admin panel (:6910)
./livong admin:stop           # Stop admin panel
```

## Tech Stack

- **Backend:** Go 1.26, Gin, PostgreSQL, JWT
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Tooling:** pnpm, Node.js CLI

## Platform Support

macOS, Windows, and Linux. The CLI adapts to each platform automatically.
