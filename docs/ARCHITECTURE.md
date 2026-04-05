# 🏗️ Livong Architecture

## 📌 Overview

**Livong** is a living experience platform designed to help users:

- Find compatible roommates  
- Discover rooms / shared spaces  
- Connect and communicate  

The system follows a **monorepo architecture** with clear separation between frontend and backend.

---

# 🧠 High-Level Architecture

Frontend (Next.js - apps/web)
        ↓
API Layer (Go - apps/backend)
        ↓
Database (PostgreSQL)

---

# 🧩 Core Components

## 1. Frontend (`apps/web`)

Built using **Next.js**.

### Responsibilities:
- User interface (UI/UX)
- API consumption
- Client-side state management
- Routing & navigation

### Key Features:
- Authentication (OTP-based login)
- Profile setup & editing
- Explore listings & users
- Interest & match flow
- Chat interface

---

## 2. Backend (`apps/backend`)

Built using **Go**.

### Responsibilities:
- API development
- Business logic
- Authentication & authorization
- Database management
- Matching logic
- Chat handling (WebSocket later)

### Modules (planned):

auth/
user/
listing/
interest/
match/
chat/
review/ (future)

---

## 3. Database

Recommended: **PostgreSQL**

### Core Entities:
- Users
- Profiles
- Listings
- Interests
- Matches
- Messages
- Reviews (future)

---

## 4. Shared Layer (`packages/`)

Used to maintain consistency between frontend and backend.

### Includes:

- `types/` → API contracts & interfaces  
- `constants/` → Enums (status, types, etc.)  
- `utils/` → Shared helpers  

---

# 🔄 Data Flow

## User Journey:

User → Frontend → API → Database
                     ↓
                Response → Frontend → UI Update

---

## Example Flow (Interest → Match):

1. User sends interest
2. Backend stores interest
3. Receiver accepts
4. Backend creates match
5. Chat becomes enabled

---

# 🔐 Authentication Flow

- OTP-based login (MVP)
- Token-based session (JWT or session cookies)

Login → OTP Verify → Token → Authenticated Requests

---

# 🧠 Matching Logic (MVP)

Matching is based on:

- Budget overlap  
- Location match  
- Optional preferences:
  - Smoking  
  - Drinking  
  - Cleanliness  
  - Sleep schedule  

👉 Simple scoring system (no AI in MVP)

---

# 🌐 Deployment Architecture

## Frontend
- Hosted on Vercel  
- Uses only `apps/web`

---

## Backend
- Hosted on VPS  
- Runs only `apps/backend`

---

## Domain Setup

Frontend → livong.app
Backend  → api.livong.app

---

# ⚙️ Environment Configuration

Separate environment files:

apps/web/.env
apps/backend/.env

---

# 🔒 Security Considerations

- Do not expose backend secrets to frontend  
- Use HTTPS for all communication  
- Validate all inputs on backend  
- Use authentication tokens securely  

---

# 📦 Monorepo Strategy

## Why Monorepo?

- Single source of truth  
- Faster development  
- Easier collaboration  
- Shared types & contracts  

---

## Structure:

apps/
  web/
  backend/

packages/
  types/
  utils/
  constants/

docs/

---

# 🔄 Development Workflow

- `main` → production  
- `dev` → staging/integration  
- `feature/*` → development  

All changes go through **Pull Requests (PRs)**.

---

# 🚀 Future Architecture (Scalable Vision)

As the product grows:

- Introduce microservices (if needed)
- Add caching layer (Redis)
- Add real-time chat service
- Introduce recommendation engine
- Add service marketplace (tiffin, cleaning, etc.)

---

# 🎯 Design Principles

- Keep it simple (MVP first)  
- Separate concerns clearly  
- Backend owns business logic  
- Frontend remains lightweight  
- Build for scalability, not complexity  

---

# ✅ Summary

Livong uses a **clean monorepo architecture** with:

- Next.js frontend  
- Go backend  
- PostgreSQL database  

👉 Designed for:
- Fast iteration  
- Clear structure  
- Future scalability  

---

**Livong = Living Experience Platform 🚀**
