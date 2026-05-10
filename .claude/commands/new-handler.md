---
description: Scaffold a new backend feature (handler + route + optional migration)
argument-hint: "<feature-name> e.g. rooms, messages, reports"
---

Scaffold a new Go backend feature called `$ARGUMENTS` following the patterns in `.cursorrules`:

1. Create `apps/backend/internal/$ARGUMENTS/handler.go` with:
   - `type Handler struct { db *sql.DB }`
   - `func NewHandler(db *sql.DB) *Handler`
   - One stub handler method (e.g. `List`) using `c.ShouldBindJSON`, `gin.H{"error": ...}`, `c.GetString("userId")`, parameterized SQL
2. Register the route group in `apps/backend/main.go` — ask whether public or protected.
3. If the feature needs a new table, append a `CREATE TABLE IF NOT EXISTS` migration to `apps/backend/internal/database/migrations.go` with UUID PK, snake_case columns, `CURRENT_TIMESTAMP` defaults, plural table name.
4. Update `docs/api.md` with the new endpoint.

Before writing, confirm: feature name, public/protected, and whether a new table is needed.
