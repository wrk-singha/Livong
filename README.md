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
```

## Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+

### Backend
```bash
cd apps/backend
cp .env.example .env  # Edit with your DB credentials
go run cmd/server/main.go
```

### Frontend
```bash
cd apps/web
npm install
npm run dev
```

### Environment Variables

**Backend** (`apps/backend/.env`):
- `PORT` — Server port (default: 8080)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for JWT tokens

**Frontend** (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend API URL (default: http://localhost:8080)
