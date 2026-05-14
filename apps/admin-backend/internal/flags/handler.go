// Admin-side feature flags handler. Writes to the shared feature_flags table.
// Main backend (apps/backend) has its own cached read-side package; this one
// is write-only + read-for-display since admins toggle infrequently.
package flags

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Flag struct {
	Key         string    `json:"key"`
	Enabled     bool      `json:"enabled"`
	Description string    `json:"description"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

// List all flags so the admin panel can render toggles.
func (h *Handler) List(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT key, enabled, COALESCE(description,''), updated_at
		FROM feature_flags ORDER BY key
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list flags"})
		return
	}
	defer rows.Close()

	out := []Flag{}
	for rows.Next() {
		var f Flag
		if err := rows.Scan(&f.Key, &f.Enabled, &f.Description, &f.UpdatedAt); err != nil {
			continue
		}
		out = append(out, f)
	}
	c.JSON(http.StatusOK, out)
}

// Patch a single flag. Body: { "enabled": true|false }. The main backend
// picks up the change within its 5s cache TTL — no restart needed.
func (h *Handler) Patch(c *gin.Context) {
	key := c.Param("key")
	var body struct {
		Enabled *bool `json:"enabled" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Enabled == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enabled field is required (boolean)"})
		return
	}

	var f Flag
	err := h.db.QueryRow(`
		UPDATE feature_flags SET enabled = $2, updated_at = NOW()
		WHERE key = $1
		RETURNING key, enabled, COALESCE(description,''), updated_at
	`, key, *body.Enabled).Scan(&f.Key, &f.Enabled, &f.Description, &f.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "flag not found", "key": key})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update flag"})
		return
	}
	c.JSON(http.StatusOK, f)
}
