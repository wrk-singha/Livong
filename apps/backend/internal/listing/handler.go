package listing

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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

	query := `SELECT l.id, l.user_id, l.title, l.description, l.rent, l.location, l.property_type, l.available_from, l.created_at,
		(SELECT li.filename FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position, li.created_at LIMIT 1),
		COALESCE(u.is_verified, false),
		pg.sharing_type, pg.meals, pg.gender_preference
		FROM listings l
		LEFT JOIN users u ON u.id = l.user_id
		LEFT JOIN pg_details pg ON pg.listing_id = l.id
		WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if location != "" {
		query += fmt.Sprintf(" AND l.location ILIKE $%d", argIdx)
		args = append(args, "%"+location+"%")
		argIdx++
	}
	if minBudget != "" {
		query += fmt.Sprintf(" AND l.rent >= $%d", argIdx)
		args = append(args, minBudget)
		argIdx++
	}
	if maxBudget != "" {
		query += fmt.Sprintf(" AND l.rent <= $%d", argIdx)
		args = append(args, maxBudget)
		argIdx++
	}

	query += " ORDER BY l.created_at DESC"

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
		var thumbnail sql.NullString
		var verified bool
		var pgSharing, pgMeals, pgGender sql.NullString

		if err := rows.Scan(&id, &userID, &title, &description, &rent, &location, &propertyType, &availableFrom, &createdAt, &thumbnail, &verified, &pgSharing, &pgMeals, &pgGender); err != nil {
			continue
		}

		// NOTE: omit ownerVerified — users.is_verified is never set true by any
		// real verification flow yet. Returning a field that always evaluates false
		// is harmless; returning one that could later become true without an
		// actual verification process is deceptive. Re-add when ID/photo verify ships.
		_ = verified
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
		if thumbnail.Valid {
			l["thumbnail"] = "/uploads/" + thumbnail.String
		}
		if propertyType == "pg" && pgSharing.Valid {
			l["pgSummary"] = map[string]interface{}{
				"sharingType":      pgSharing.String,
				"meals":            pgMeals.String,
				"genderPreference": pgGender.String,
			}
		}
		listings = append(listings, l)
	}

	c.JSON(http.StatusOK, listings)
}

func (h *Handler) GetListing(c *gin.Context) {
	id := c.Param("id")

	var listingID, userID, title, location, propertyType string
	var description sql.NullString
	var rent int
	var availableFrom sql.NullTime
	var createdAt sql.NullTime
	var ownerName sql.NullString
	var ownerGender sql.NullString
	var ownerVerified bool
	var ownerAge sql.NullInt64
	var ownerLocation sql.NullString
	var ownerSmoking sql.NullString
	var ownerDrinking sql.NullString
	var ownerCleanliness sql.NullString
	var ownerSleepSchedule sql.NullString
	var ownerFoodPref sql.NullString

	err := h.db.QueryRow(`
		SELECT l.id, l.user_id, l.title, l.description, l.rent, l.location,
			l.property_type, l.available_from, l.created_at,
			p.name, p.gender, COALESCE(u.is_verified, false),
			p.age, p.location, p.smoking, p.drinking, p.cleanliness,
			p.sleep_schedule, p.food_preference
		FROM listings l
		LEFT JOIN profiles p ON p.user_id = l.user_id
		LEFT JOIN users u ON u.id = l.user_id
		WHERE l.id = $1
	`, id).Scan(&listingID, &userID, &title, &description, &rent, &location,
		&propertyType, &availableFrom, &createdAt, &ownerName, &ownerGender, &ownerVerified,
		&ownerAge, &ownerLocation, &ownerSmoking, &ownerDrinking, &ownerCleanliness,
		&ownerSleepSchedule, &ownerFoodPref)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "listing not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch listing"})
		return
	}

	// Fetch images
	rows, err := h.db.Query(`
		SELECT id, filename, position FROM listing_images
		WHERE listing_id = $1 ORDER BY position, created_at
	`, id)
	var images []map[string]interface{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var imgID, filename string
			var position int
			if rows.Scan(&imgID, &filename, &position) == nil {
				images = append(images, map[string]interface{}{
					"id":       imgID,
					"url":      "/uploads/" + filename,
					"position": position,
				})
			}
		}
	}

	result := gin.H{
		"id":           listingID,
		"userId":       userID,
		"title":        title,
		"description":  description.String,
		"rent":         rent,
		"location":     location,
		"propertyType": propertyType,
		"images":       images,
	}
	if availableFrom.Valid {
		result["availableFrom"] = availableFrom.Time
	}
	if createdAt.Valid {
		result["createdAt"] = createdAt.Time
	}
	if ownerName.Valid {
		result["ownerName"] = ownerName.String
	}
	if ownerGender.Valid {
		result["ownerGender"] = ownerGender.String
	}
	// NOTE: omit ownerVerified — see GetListings comment. Re-add when real verify ships.
	_ = ownerVerified
	if ownerAge.Valid {
		result["ownerAge"] = ownerAge.Int64
	}
	if ownerLocation.Valid {
		result["ownerLocation"] = ownerLocation.String
	}
	if ownerSmoking.Valid {
		result["ownerSmoking"] = ownerSmoking.String
	}
	if ownerDrinking.Valid {
		result["ownerDrinking"] = ownerDrinking.String
	}
	if ownerCleanliness.Valid {
		result["ownerCleanliness"] = ownerCleanliness.String
	}
	if ownerSleepSchedule.Valid {
		result["ownerSleepSchedule"] = ownerSleepSchedule.String
	}
	if ownerFoodPref.Valid {
		result["ownerFoodPref"] = ownerFoodPref.String
	}

	// Fetch PG details if property_type is 'pg'
	if propertyType == "pg" {
		var meals, sharingType, genderPref string
		var ac, wifi, laundry, attachedBathroom bool
		var curfew sql.NullString
		pgErr := h.db.QueryRow(`
			SELECT meals, sharing_type, ac, wifi, laundry, attached_bathroom, curfew, gender_preference
			FROM pg_details WHERE listing_id = $1
		`, id).Scan(&meals, &sharingType, &ac, &wifi, &laundry, &attachedBathroom, &curfew, &genderPref)
		if pgErr == nil {
			pgDetails := gin.H{
				"meals":            meals,
				"sharingType":      sharingType,
				"ac":               ac,
				"wifi":             wifi,
				"laundry":          laundry,
				"attachedBathroom": attachedBathroom,
				"genderPreference": genderPref,
			}
			if curfew.Valid {
				pgDetails["curfew"] = curfew.String
			}
			result["pgDetails"] = pgDetails
		}
	}

	// Owner's average rating across all their listings
	var ownerAvgRating sql.NullFloat64
	var ownerReviewCount int
	h.db.QueryRow(`
		SELECT AVG(r.rating), COUNT(r.id)
		FROM reviews r
		JOIN listings ol ON ol.id = r.listing_id
		WHERE ol.user_id = $1
	`, userID).Scan(&ownerAvgRating, &ownerReviewCount)
	if ownerAvgRating.Valid {
		result["ownerRating"] = ownerAvgRating.Float64
		result["ownerReviewCount"] = ownerReviewCount
	}

	c.JSON(http.StatusOK, result)
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

	if len(req.Title) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title too long (max 200 characters)"})
		return
	}
	if len(req.Description) > 5000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "description too long (max 5000 characters)"})
		return
	}
	if len(req.Location) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "location too long (max 200 characters)"})
		return
	}
	if req.Rent < 0 || req.Rent > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rent amount"})
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

var allowedExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

func (h *Handler) UploadImages(c *gin.Context) {
	userID := c.GetString("userId")
	listingID := c.Param("id")

	// Verify listing belongs to user
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

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no images provided"})
		return
	}
	if len(files) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "maximum 10 images allowed"})
		return
	}

	uploadDir := filepath.Join("uploads", listingID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}

	// Get current max position
	var maxPos int
	h.db.QueryRow(`SELECT COALESCE(MAX(position), -1) FROM listing_images WHERE listing_id = $1`, listingID).Scan(&maxPos)

	var uploaded []map[string]interface{}
	for i, file := range files {
		if file.Size > 5*1024*1024 {
			continue // skip files > 5MB
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if !allowedExts[ext] {
			continue // skip non-image files
		}

		// Validate actual file content type
		f, fErr := file.Open()
		if fErr != nil {
			continue
		}
		buf := make([]byte, 512)
		n, _ := f.Read(buf)
		f.Close()
		ct := http.DetectContentType(buf[:n])
		if ct != "image/jpeg" && ct != "image/png" && ct != "image/webp" {
			continue
		}

		// Generate unique filename
		b := make([]byte, 16)
		rand.Read(b)
		filename := hex.EncodeToString(b) + ext
		relPath := filepath.Join(listingID, filename)
		fullPath := filepath.Join("uploads", relPath)

		if err := c.SaveUploadedFile(file, fullPath); err != nil {
			continue
		}

		pos := maxPos + 1 + i
		var imgID string
		err := h.db.QueryRow(`
			INSERT INTO listing_images (listing_id, filename, position)
			VALUES ($1, $2, $3) RETURNING id
		`, listingID, relPath, pos).Scan(&imgID)
		if err != nil {
			os.Remove(fullPath)
			continue
		}

		uploaded = append(uploaded, map[string]interface{}{
			"id":       imgID,
			"url":      "/uploads/" + relPath,
			"position": pos,
		})
	}

	if len(uploaded) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no valid images uploaded"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"images": uploaded})
}
