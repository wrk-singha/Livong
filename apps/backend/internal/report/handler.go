// Package report handles user-submitted safety reports against listings,
// profiles, or chat messages. Submitting is open to any authed user; reading
// the report queue is admin-only (lives in admin-backend).
package report

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

// Allowed enum values, matching the DB CHECK and admin queue filter.
var (
	allowedTargets = map[string]bool{"listing": true, "profile": true, "message": true}
	allowedReasons = map[string]bool{
		"spam":          true,
		"harassment":    true,
		"scam":          true,
		"fake_profile":  true,
		"inappropriate": true,
		"other":         true,
	}
)

// Create — POST /reports.
// Body: { targetType, targetId, reason, details? }
// Validates inputs, writes a row, no rate limit yet (add when needed).
func (h *Handler) Create(c *gin.Context) {
	reporterID := c.GetString("userId")

	var req struct {
		TargetType string `json:"targetType" binding:"required"`
		TargetID   string `json:"targetId"   binding:"required"`
		Reason     string `json:"reason"     binding:"required"`
		Details    string `json:"details"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "targetType, targetId, and reason are required"})
		return
	}

	if !allowedTargets[req.TargetType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid targetType"})
		return
	}
	if !allowedReasons[req.Reason] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reason"})
		return
	}
	if len(req.Details) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "details too long"})
		return
	}

	var details interface{} = nil
	if req.Details != "" {
		details = req.Details
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, reporterID, req.TargetType, req.TargetID, req.Reason, details).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to file report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "report received"})
}
