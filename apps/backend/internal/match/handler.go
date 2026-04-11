package match

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

func (h *Handler) GetMatches(c *gin.Context) {
	userID := c.GetString("userId")

	rows, err := h.db.Query(`
		SELECT m.id, m.listing_id, m.created_at,
			CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END as matched_user_id
		FROM matches m
		WHERE m.user1_id = $1 OR m.user2_id = $1
		ORDER BY m.created_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch matches"})
		return
	}
	defer rows.Close()

	var matches []map[string]interface{}
	for rows.Next() {
		var matchID, listingID, matchedUserID string
		var createdAt sql.NullTime
		if err := rows.Scan(&matchID, &listingID, &createdAt, &matchedUserID); err != nil {
			continue
		}

		// Fetch matched user's profile
		var name sql.NullString
		h.db.QueryRow("SELECT name FROM profiles WHERE user_id = $1", matchedUserID).Scan(&name)

		m := map[string]interface{}{
			"matchId":   matchID,
			"listingId": listingID,
			"user": map[string]interface{}{
				"id":   matchedUserID,
				"name": name.String,
			},
		}
		matches = append(matches, m)
	}

	if matches == nil {
		matches = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, matches)
}
