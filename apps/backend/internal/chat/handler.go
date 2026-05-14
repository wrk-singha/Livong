package chat

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rohit/livong-backend/internal/ws"
)

type Handler struct {
	db  *sql.DB
	hub *ws.Hub // optional — nil-safe; broadcast no-ops if not wired
}

func NewHandler(db *sql.DB, hub *ws.Hub) *Handler {
	return &Handler{db: db, hub: hub}
}

// notifyMessages tells subscribers of "messages:<matchId>" that there's
// something new. Pushes only an invalidation envelope — the client refetches
// via the existing GET /messages/:matchId. Keeps REST as source of truth.
func (h *Handler) notifyMessages(matchID string) {
	if h.hub == nil {
		return
	}
	h.hub.Broadcast("messages:"+matchID, ws.Event{
		Type:   "invalidate",
		Entity: []string{"messages", matchID},
	})
}

func (h *Handler) GetMessages(c *gin.Context) {
	userID := c.GetString("userId")
	matchID := c.Param("matchId")

	// Verify user is part of this match
	var exists bool
	h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2))
	`, matchID, userID).Scan(&exists)

	if !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized to view these messages"})
		return
	}

	since := c.Query("since")
	var rows *sql.Rows
	var err error
	if since != "" {
		rows, err = h.db.Query(`
			SELECT id, sender_id, message, message_type, created_at
			FROM messages WHERE match_id = $1 AND created_at > $2
			ORDER BY created_at ASC
		`, matchID, since)
	} else {
		rows, err = h.db.Query(`
			SELECT id, sender_id, message, message_type, created_at
			FROM messages WHERE match_id = $1
			ORDER BY created_at ASC
		`, matchID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch messages"})
		return
	}
	defer rows.Close()

	messages := []map[string]interface{}{}
	for rows.Next() {
		var id, senderID, message, messageType string
		var createdAt sql.NullTime
		if err := rows.Scan(&id, &senderID, &message, &messageType, &createdAt); err != nil {
			continue
		}
		messages = append(messages, map[string]interface{}{
			"id":          id,
			"senderId":    senderID,
			"message":     message,
			"messageType": messageType,
			"createdAt":   createdAt.Time,
		})
	}

	if messages == nil {
		messages = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, messages)
}

func (h *Handler) SendMessage(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		MatchID string `json:"matchId" binding:"required"`
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "matchId and message are required"})
		return
	}

	if len(req.Message) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message too long (max 2000 characters)"})
		return
	}

	// Verify user is part of this match AND no block exists either way.
	// A single query covers both: NOT EXISTS the block in either direction.
	var allowed bool
	h.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM matches m
			WHERE m.id = $1 AND ($2 IN (m.user1_id, m.user2_id))
			AND NOT EXISTS (
				SELECT 1 FROM user_blocks b
				WHERE (b.blocker_id = $2 AND b.blocked_id IN (m.user1_id, m.user2_id))
				   OR (b.blocked_id = $2 AND b.blocker_id IN (m.user1_id, m.user2_id))
			)
		)
	`, req.MatchID, userID).Scan(&allowed)

	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized to send messages in this match"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO messages (match_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'text') RETURNING id
	`, req.MatchID, userID, req.Message).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send message"})
		return
	}

	h.notifyMessages(req.MatchID)
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *Handler) ShareContact(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		MatchID      string `json:"matchId" binding:"required"`
		ContactType  string `json:"contactType" binding:"required"`
		ContactValue string `json:"contactValue" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "matchId, contactType, and contactValue are required"})
		return
	}

	// Validate contactType
	if req.ContactType != "phone" && req.ContactType != "email" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contactType must be 'phone' or 'email'"})
		return
	}

	// Verify user is part of this match
	var exists bool
	h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2))
	`, req.MatchID, userID).Scan(&exists)

	if !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	// Store as a contact_share message with JSON payload
	payload, _ := json.Marshal(map[string]string{
		"contactType":  req.ContactType,
		"contactValue": req.ContactValue,
	})

	var id string
	err := h.db.QueryRow(`
		INSERT INTO messages (match_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'contact_share') RETURNING id
	`, req.MatchID, userID, string(payload)).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to share contact"})
		return
	}

	h.notifyMessages(req.MatchID)
	c.JSON(http.StatusCreated, gin.H{"id": id, "messageType": "contact_share"})
}
