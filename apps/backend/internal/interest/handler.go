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
