---
description: "Use when editing Go backend files under apps/backend/. Covers handler patterns, database queries, middleware, routes, and error responses."
applyTo: "apps/backend/**"
---

# Backend Rules

## File Locations

| What | Where |
|------|-------|
| Entry point | `main.go` |
| Feature handlers | `internal/{feature}/handler.go` |
| Database connection | `internal/database/db.go` |
| Migrations | `internal/database/migrations.go` |
| Auth middleware | `internal/middleware/middleware.go` |
| Auth/JWT logic | `internal/auth/handler.go` |

## Handler Pattern

Every handler follows this exact structure:

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
    userId := c.GetString("userId")

    var req struct {
        Title string `json:"title" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

    var id string
    err := h.db.QueryRow(
        `INSERT INTO things (user_id, title) VALUES ($1, $2) RETURNING id`,
        userId, req.Title,
    ).Scan(&id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"id": id})
}
```

## Do / Don't

| Do | Don't |
|----|-------|
| `*sql.DB` in Handler struct | ORMs (GORM, sqlx, ent) |
| `NewHandler(db)` constructor | Global DB variables |
| `c.ShouldBindJSON(&req)` with inline struct | Separate request type files |
| `gin.H{"error": "message"}` | Custom error structs |
| `$1, $2` parameterized queries | String concatenation in SQL |
| `c.GetString("userId")` from middleware | Parse JWT in handlers |
| One `handler.go` per feature package | Multiple files per feature |

## Routes

Register in `main.go`:

```go
// Public
router.POST("/auth/login", authHandler.Login)

// Protected (requires JWT)
protected := router.Group("/")
protected.Use(middleware.Auth())
{
    protected.GET("/listings", listingHandler.GetListings)
    protected.POST("/listings", listingHandler.CreateListing)
}
```

- Public routes: auth endpoints only
- Protected routes: everything else, grouped with `middleware.Auth()`

## Database Conventions

| Convention | Example |
|-----------|---------|
| Table names | Plural, snake_case: `users`, `listings`, `matches` |
| Column names | snake_case: `user_id`, `created_at`, `property_type` |
| JSON field names | camelCase: `userId`, `createdAt`, `propertyType` |
| Primary keys | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Timestamps | `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| Foreign keys | `user_id UUID REFERENCES users(id)` |
| Status fields | VARCHAR with string literals: `'pending'`, `'accepted'` |

## Migrations

Add new migrations to the `migrations` slice in `internal/database/migrations.go`:

```go
migrations := []string{
    `CREATE TABLE IF NOT EXISTS new_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
}
```

- Always use `CREATE TABLE IF NOT EXISTS`
- Append new migrations — never modify existing ones
- Schema changes also need `ALTER TABLE IF NOT EXISTS` or conditional logic

## Error Responses

```go
c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})       // 400
c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})        // 401
c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})            // 403
c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})               // 404
c.JSON(http.StatusConflict, gin.H{"error": "Already exists"})          // 409
c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to X"})  // 500
```

- Always human-readable error messages
- Never expose internal errors, SQL errors, or stack traces to the client

## Auth Flow

1. `POST /auth/login` → validates phone regex (`^\+?[1-9]\d{6,14}$`), rate-limits (3 OTP/15min/phone), generates OTP, SHA-256 hashes it, stores in memory, prints plaintext to terminal via `fmt.Printf`
2. `POST /auth/verify-otp` → rate-limits (5 attempts/15min/phone), compares `hashOTP(input)` against stored hash → creates user if new → returns JWT
3. JWT: HS256, 7-day expiry, `iss: "livong"`, `aud: "livong-api"` (admin uses `livong-admin`/`livong-admin-api`)
4. Middleware extracts JWT → validates signing method + iss/aud → sets `c.Set("userId", claims.UserID)` → handlers use `c.GetString("userId")`

## Security (already in place)

- OTPs: SHA-256 hashed via `hashOTP()` before storage — never stored or returned in plaintext
- Rate limiting: in-memory maps with mutex locks (`loginRateStore`, `rateAttempts`)
- Phone validation: regex `^\+?[1-9]\d{6,14}$`
- Input length limits: name ≤100, description ≤5000, message ≤2000, location ≤200, title ≤200, rent 0–10M, age 18–120
- Security headers in middleware: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP (`default-src 'none'; frame-ancestors 'none'`), X-DNS-Prefetch-Control, X-Download-Options, X-XSS-Protection:0
- CORS: restricted to `CORS_ORIGINS` env (default `http://localhost:3000`)
- Image uploads: content-type sniffing via `http.DetectContentType`, max 5MB, allowed extensions `.jpg/.jpeg/.png/.webp`
- Auth: Bearer token in Authorization header (not cookies) — CSRF not needed
- JWT signing method validation: `alg` must be HS256
