# Livong

A living experience platform to find compatible roommates and shared spaces.

## Project Structure

```
apps/
  backend/    → Go API server (Gin + PostgreSQL)
  web/        → Next.js frontend (TypeScript + Tailwind)

packages/
  types/      → Shared TypeScript types
  constants/  → Shared enums and constants
  utils/      → Shared utilities

docs/         → Product documentation
cli.mjs       → Cross-platform CLI (Node.js)
livong        → macOS/Linux launcher
livong.bat    → Windows launcher
```

## Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- pnpm (`npm i -g pnpm`)

### Quick Start (Recommended)

Use the interactive CLI to start everything:

```bash
# macOS / Linux
./livong

# Windows
livong.bat
```

This opens an interactive menu where you can start/stop servers, install dependencies, and more. Each server runs in its own terminal window. Exiting the menu stops everything.

### CLI Commands

You can also run commands directly:

```bash
./livong start              # Start backend + frontend
./livong stop               # Stop everything
./livong restart            # Restart everything
./livong status             # Show what's running
./livong fresh              # Clean + install + start all

./livong server:start       # Start Go backend only
./livong server:stop        # Stop backend
./livong server:restart     # Restart backend

./livong web:dev            # Start Next.js dev server
./livong web:stop           # Stop frontend
./livong web:restart        # Restart frontend
./livong web:build          # Production build
./livong web:prod           # Start production server
./livong web:clean          # Clear .next cache
./livong web:lint           # Run ESLint
./livong web:install        # Install pnpm dependencies
```

### Manual Setup

**Backend:**
```bash
cd apps/backend
DATABASE_URL="postgres://youruser@localhost:5432/livong?sslmode=disable" \
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
- `JWT_SECRET` — Secret key for JWT tokens

**Frontend** (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend API URL (default: http://localhost:8080)

## Platform Support

The CLI works on **macOS**, **Windows**, and **Linux**:
- **macOS** — Opens Terminal.app windows
- **Windows** — Opens cmd.exe windows
- **Linux** — Uses gnome-terminal, konsole, or xterm
