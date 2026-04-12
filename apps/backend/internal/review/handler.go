package review

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

func (h *Handler) CreateReview(c *gin.Context) {
	userId := c.GetString("userId")

	var req struct {
		ListingId string `json:"listingId" binding:"required"`
		Rating    int    `json:"rating" binding:"required"`
		Comment   string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rating must be between 1 and 5"})
		return
	}

	// Verify user had a match on this listing (was a roommate)
	var matchCount int
	err := h.db.QueryRow(
		`SELECT COUNT(*) FROM matches WHERE listing_id = $1 AND (user1_id = $2 OR user2_id = $2)`,
		req.ListingId, userId,
	).Scan(&matchCount)
	if err != nil || matchCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only review listings you were matched on"})
		return
	}

	// Cannot review own listing
	var listingOwnerId string
	err = h.db.QueryRow(`SELECT user_id FROM listings WHERE id = $1`, req.ListingId).Scan(&listingOwnerId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}
	if listingOwnerId == userId {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot review your own listing"})
		return
	}

	var id string
	err = h.db.QueryRow(
		`INSERT INTO reviews (reviewer_id, listing_id, rating, comment)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		userId, req.ListingId, req.Rating, req.Comment,
	).Scan(&id)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "reviews_reviewer_id_listing_id_key"` {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already reviewed this listing"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *Handler) GetListingReviews(c *gin.Context) {
	userId := c.GetString("userId")
	listingId := c.Param("listingId")

	// Check user plan
	var plan string
	err := h.db.QueryRow(`SELECT COALESCE(plan, 'free') FROM users WHERE id = $1`, userId).Scan(&plan)
	if err != nil {
		plan = "free"
	}
	isPaid := plan != "free"

	// Get average and count
	var avgRating float64
	var reviewCount int
	err = h.db.QueryRow(
		`SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE listing_id = $1`,
		listingId,
	).Scan(&avgRating, &reviewCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	// Get individual reviews
	rows, err := h.db.Query(
		`SELECT r.id, r.rating, r.comment, r.created_at, COALESCE(p.name, 'Anonymous') as reviewer_name
		 FROM reviews r
		 LEFT JOIN profiles p ON p.user_id = r.reviewer_id
		 WHERE r.listing_id = $1
		 ORDER BY r.created_at DESC`,
		listingId,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}
	defer rows.Close()

	type reviewItem struct {
		Id           string  `json:"id"`
		Rating       int     `json:"rating"`
		Comment      *string `json:"comment"`
		CreatedAt    string  `json:"createdAt"`
		ReviewerName string  `json:"reviewerName"`
	}

	var reviews []reviewItem
	for rows.Next() {
		var r reviewItem
		var comment sql.NullString
		if err := rows.Scan(&r.Id, &r.Rating, &comment, &r.CreatedAt, &r.ReviewerName); err != nil {
			continue
		}
		if comment.Valid && isPaid {
			r.Comment = &comment.String
		}
		reviews = append(reviews, r)
	}

	if reviews == nil {
		reviews = []reviewItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"averageRating": avgRating,
		"reviewCount":   reviewCount,
		"reviews":       reviews,
		"isPaid":        isPaid,
	})
}
