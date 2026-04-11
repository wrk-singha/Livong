# Livong

A roommate and shared-living platform. Find compatible people, discover rooms, connect and chat.

## Structure

```
apps/
  backend/    Go API (Gin + PostgreSQL)
  web/        Next.js frontend (TypeScript + Tailwind CSS v4)

docs/         Documentation (PRD, Architecture, API, DB Schema)
cli.mjs       Cross-platform dev CLI
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
go run cmd/server/main.go
```

**Frontend:**
```bash
cd apps/web
pnpm install
pnpm dev
```

### Environment Variables

**Backend** (`apps/backend/.env`):
- `PORT` — Server port (default: 8080)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key

**Frontend** (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default: http://localhost:8080)

## CLI Commands

```bash
./livong server:start     # Start Go backend
./livong server:stop      # Stop backend
./livong web:dev          # Start Next.js dev server
./livong web:stop         # Stop frontend
./livong web:build        # Production build
./livong web:clean        # Clear .next cache
./livong web:install      # Install pnpm dependencies
```

## Tech Stack

- **Backend:** Go 1.26, Gin, PostgreSQL, JWT
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Tooling:** pnpm, Node.js CLI

## Platform Support

macOS, Windows, and Linux. The CLI adapts to each platform automatically.
