package interest

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

func (h *Handler) SendInterest(c *gin.Context) {
	senderID := c.GetString("userId")

	// Require profile to send interest
	var profileExists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = $1)`, senderID).Scan(&profileExists)
	if !profileExists {
		c.JSON(http.StatusForbidden, gin.H{"error": "complete your profile before sending interest"})
		return
	}

	var req struct {
		ReceiverID string `json:"receiverId" binding:"required"`
		ListingID  string `json:"listingId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiverId and listingId are required"})
		return
	}

	if senderID == req.ReceiverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot send interest to yourself"})
		return
	}

	// Check for duplicate
	var exists bool
	h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM interests WHERE sender_id = $1 AND receiver_id = $2 AND listing_id = $3)
	`, senderID, req.ReceiverID, req.ListingID).Scan(&exists)
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "interest already sent"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO interests (sender_id, receiver_id, listing_id, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id
	`, senderID, req.ReceiverID, req.ListingID).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send interest"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// GetReceived returns pending interests where the current user is the receiver —
// the listing-owner's "inbox" of people who want to live in their place.
// Without this endpoint, the matching loop is broken: owners never see who's interested.
func (h *Handler) GetReceived(c *gin.Context) {
	userID := c.GetString("userId")

	rows, err := h.db.Query(`
		SELECT i.id, i.sender_id, i.listing_id, i.created_at,
			COALESCE(p.name, 'Unknown'),
			COALESCE(p.age, 0),
			COALESCE(p.gender, ''),
			COALESCE(p.location, ''),
			COALESCE(p.avatar, ''),
			l.title,
			l.location
		FROM interests i
		LEFT JOIN profiles p ON p.user_id = i.sender_id
		LEFT JOIN listings l ON l.id = i.listing_id
		WHERE i.receiver_id = $1 AND i.status = 'pending'
		ORDER BY i.created_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interests"})
		return
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		var id, senderID, listingID, senderName, senderGender, senderLocation, senderAvatar, listingTitle, listingLocation string
		var senderAge int
		var createdAt sql.NullTime
		if err := rows.Scan(&id, &senderID, &listingID, &createdAt, &senderName, &senderAge, &senderGender, &senderLocation, &senderAvatar, &listingTitle, &listingLocation); err != nil {
			continue
		}
		item := map[string]interface{}{
			"id":              id,
			"senderId":        senderID,
			"senderName":      senderName,
			"senderGender":    senderGender,
			"senderLocation":  senderLocation,
			"listingId":       listingID,
			"listingTitle":    listingTitle,
			"listingLocation": listingLocation,
		}
		if senderAge > 0 {
			item["senderAge"] = senderAge
		}
		if senderAvatar != "" {
			item["senderAvatar"] = "/uploads/" + senderAvatar
		}
		if createdAt.Valid {
			item["createdAt"] = createdAt.Time
		}
		out = append(out, item)
	}

	c.JSON(http.StatusOK, out)
}

func (h *Handler) UpdateInterest(c *gin.Context) {
	userID := c.GetString("userId")
	interestID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}

	if req.Status != "accepted" && req.Status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be 'accepted' or 'rejected'"})
		return
	}

	// Verify the user is the receiver
	var senderID, receiverID, listingID string
	err := h.db.QueryRow(`
		SELECT sender_id, receiver_id, listing_id FROM interests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
	`, interestID, userID).Scan(&senderID, &receiverID, &listingID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "interest not found or already processed"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interest"})
		return
	}

	// Update status
	_, err = h.db.Exec("UPDATE interests SET status = $1 WHERE id = $2", req.Status, interestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update interest"})
		return
	}

	// If accepted, create a match
	if req.Status == "accepted" {
		_, err = h.db.Exec(`
			INSERT INTO matches (user1_id, user2_id, listing_id) VALUES ($1, $2, $3)
		`, senderID, receiverID, listingID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create match"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "interest " + req.Status})
}
