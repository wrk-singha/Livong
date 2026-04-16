package pg

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

func (h *Handler) Upsert(c *gin.Context) {
	userID := c.GetString("userId")
	listingID := c.Param("id")

	var ownerID string
	err := h.db.QueryRow(`SELECT user_id FROM listings WHERE id = $1`, listingID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "listing not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify listing"})
		return
	}
	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your listing"})
		return
	}

	var req struct {
		Meals            string `json:"meals"`
		SharingType      string `json:"sharingType"`
		AC               bool   `json:"ac"`
		WiFi             bool   `json:"wifi"`
		Laundry          bool   `json:"laundry"`
		AttachedBathroom bool   `json:"attachedBathroom"`
		Curfew           string `json:"curfew"`
		GenderPreference string `json:"genderPreference"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	validMeals := map[string]bool{"none": true, "veg": true, "both": true}
	if req.Meals != "" && !validMeals[req.Meals] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid meals value"})
		return
	}
	validSharing := map[string]bool{"single": true, "double": true, "triple": true}
	if req.SharingType != "" && !validSharing[req.SharingType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sharing type"})
		return
	}
	validGender := map[string]bool{"male": true, "female": true, "any": true}
	if req.GenderPreference != "" && !validGender[req.GenderPreference] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid gender preference"})
		return
	}
	if len(req.Curfew) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "curfew text too long"})
		return
	}

	if req.Meals == "" {
		req.Meals = "none"
	}
	if req.SharingType == "" {
		req.SharingType = "single"
	}
	if req.GenderPreference == "" {
		req.GenderPreference = "any"
	}

	_, err = h.db.Exec(`
		INSERT INTO pg_details (listing_id, meals, sharing_type, ac, wifi, laundry, attached_bathroom, curfew, gender_preference)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (listing_id) DO UPDATE SET
			meals = $2, sharing_type = $3, ac = $4, wifi = $5,
			laundry = $6, attached_bathroom = $7, curfew = $8, gender_preference = $9
	`, listingID, req.Meals, req.SharingType, req.AC, req.WiFi, req.Laundry, req.AttachedBathroom, req.Curfew, req.GenderPreference)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save PG details"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "PG details saved"})
}

func (h *Handler) Get(c *gin.Context) {
	listingID := c.Param("id")

	var meals, sharingType, genderPreference string
	var ac, wifi, laundry, attachedBathroom bool
	var curfew sql.NullString

	err := h.db.QueryRow(`
		SELECT meals, sharing_type, ac, wifi, laundry, attached_bathroom, curfew, gender_preference
		FROM pg_details WHERE listing_id = $1
	`, listingID).Scan(&meals, &sharingType, &ac, &wifi, &laundry, &attachedBathroom, &curfew, &genderPreference)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "no PG details found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch PG details"})
		return
	}

	result := gin.H{
		"meals":            meals,
		"sharingType":      sharingType,
		"ac":               ac,
		"wifi":             wifi,
		"laundry":          laundry,
		"attachedBathroom": attachedBathroom,
		"genderPreference": genderPreference,
	}
	if curfew.Valid {
		result["curfew"] = curfew.String
	}

	c.JSON(http.StatusOK, result)
}
