// Package block lets a user block another user. Effects (enforced where the
// FK-style filter is applied):
//   - chat: blocked user can't send messages to the blocker, and the blocker
//     doesn't see incoming messages from them
//   - listings/explore: blocker doesn't see listings owned by blocked users
//   - matches/interests: blocking severs the visible relationship without
//     deleting the underlying rows (data kept for safety review)
//
// This handler exposes the CRUD; the enforcement filters live wherever a
// query reads cross-user data — wired in chat/handler.go, listing/handler.go,
// and match/handler.go.
package block

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

// Create — POST /blocks  body: { blockedId }
func (h *Handler) Create(c *gin.Context) {
	blockerID := c.GetString("userId")

	var req struct {
		BlockedID string `json:"blockedId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "blockedId is required"})
		return
	}

	if blockerID == req.BlockedID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot block yourself"})
		return
	}

	_, err := h.db.Exec(`
		INSERT INTO user_blocks (blocker_id, blocked_id)
		VALUES ($1, $2)
		ON CONFLICT (blocker_id, blocked_id) DO NOTHING
	`, blockerID, req.BlockedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to block user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "user blocked"})
}

// Delete — DELETE /blocks/:userId  unblocks the given user
func (h *Handler) Delete(c *gin.Context) {
	blockerID := c.GetString("userId")
	blockedID := c.Param("userId")

	if _, err := h.db.Exec(
		`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
		blockerID, blockedID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unblock"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user unblocked"})
}

// List — GET /blocks  returns users the current user has blocked, with profile name.
func (h *Handler) List(c *gin.Context) {
	blockerID := c.GetString("userId")

	rows, err := h.db.Query(`
		SELECT b.blocked_id, b.created_at, COALESCE(p.name, 'Unknown')
		FROM user_blocks b
		LEFT JOIN profiles p ON p.user_id = b.blocked_id
		WHERE b.blocker_id = $1
		ORDER BY b.created_at DESC
	`, blockerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch blocks"})
		return
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		var id, name string
		var createdAt sql.NullTime
		if err := rows.Scan(&id, &createdAt, &name); err != nil {
			continue
		}
		item := map[string]interface{}{"userId": id, "name": name}
		if createdAt.Valid {
			item["createdAt"] = createdAt.Time
		}
		out = append(out, item)
	}

	c.JSON(http.StatusOK, out)
}
