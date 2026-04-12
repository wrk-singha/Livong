package listing

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) GetListings(c *gin.Context) {
	location := c.Query("location")
	minBudget := c.Query("minBudget")
	maxBudget := c.Query("maxBudget")

	query := "SELECT id, user_id, title, description, rent, location, property_type, available_from, created_at FROM listings WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if location != "" {
		query += fmt.Sprintf(" AND location ILIKE $%d", argIdx)
		args = append(args, "%"+location+"%")
		argIdx++
	}
	if minBudget != "" {
		query += fmt.Sprintf(" AND rent >= $%d", argIdx)
		args = append(args, minBudget)
		argIdx++
	}
	if maxBudget != "" {
		query += fmt.Sprintf(" AND rent <= $%d", argIdx)
		args = append(args, maxBudget)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch listings"})
		return
	}
	defer rows.Close()

	var listings []map[string]interface{}
	for rows.Next() {
		var id, userID, title, location, propertyType string
		var description sql.NullString
		var rent int
		var availableFrom sql.NullTime
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &userID, &title, &description, &rent, &location, &propertyType, &availableFrom, &createdAt); err != nil {
			continue
		}

		l := map[string]interface{}{
			"id":           id,
			"userId":       userID,
			"title":        title,
			"description":  description.String,
			"rent":         rent,
			"location":     location,
			"propertyType": propertyType,
		}
		if availableFrom.Valid {
			l["availableFrom"] = availableFrom.Time
		}
		listings = append(listings, l)
	}

	c.JSON(http.StatusOK, listings)
}

func (h *Handler) GetListing(c *gin.Context) {
	id := c.Param("id")

	var l struct {
		ID           string         `json:"id"`
		UserID       string         `json:"userId"`
		Title        string         `json:"title"`
		Description  sql.NullString `json:"-"`
		Rent         int            `json:"rent"`
		Location     string         `json:"location"`
		PropertyType string         `json:"propertyType"`
	}

	err := h.db.QueryRow(`
		SELECT id, user_id, title, description, rent, location, property_type
		FROM listings WHERE id = $1
	`, id).Scan(&l.ID, &l.UserID, &l.Title, &l.Description, &l.Rent, &l.Location, &l.PropertyType)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "listing not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch listing"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           l.ID,
		"userId":       l.UserID,
		"title":        l.Title,
		"description":  l.Description.String,
		"rent":         l.Rent,
		"location":     l.Location,
		"propertyType": l.PropertyType,
	})
}

func (h *Handler) CreateListing(c *gin.Context) {
	userID := c.GetString("userId")

	// Require profile to create a listing
	var profileExists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = $1)`, userID).Scan(&profileExists)
	if !profileExists {
		c.JSON(http.StatusForbidden, gin.H{"error": "complete your profile before creating a listing"})
		return
	}

	var req struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		Rent         int    `json:"rent" binding:"required"`
		Location     string `json:"location" binding:"required"`
		PropertyType string `json:"propertyType" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO listings (user_id, title, description, rent, location, property_type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, userID, req.Title, req.Description, req.Rent, req.Location, req.PropertyType).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create listing"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}
