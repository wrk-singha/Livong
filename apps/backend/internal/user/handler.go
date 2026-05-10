package user

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
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

func (h *Handler) GetProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var profile struct {
		ID            string  `json:"id"`
		Name          *string `json:"name"`
		Age           *int    `json:"age"`
		Gender        *string `json:"gender"`
		Location      *string `json:"location"`
		Avatar        *string `json:"avatar"`
		Smoking       *string `json:"smoking"`
		Drinking      *string `json:"drinking"`
		Cleanliness   *string `json:"cleanliness"`
		SleepSchedule *string `json:"sleepSchedule"`
		WorkSchedule  *string `json:"workSchedule"`
		Pets          *string `json:"pets"`
		FoodPref      *string `json:"foodPreference"`
		IsBroker      bool    `json:"isBroker"`
	}

	err := h.db.QueryRow(`
		SELECT id, name, age, gender, location, avatar,
			smoking, drinking, cleanliness, sleep_schedule, work_schedule, pets, food_preference,
			COALESCE(is_broker, false)
		FROM profiles WHERE user_id = $1
	`, userID).Scan(
		&profile.ID, &profile.Name, &profile.Age, &profile.Gender,
		&profile.Location, &profile.Avatar,
		&profile.Smoking, &profile.Drinking, &profile.Cleanliness,
		&profile.SleepSchedule, &profile.WorkSchedule, &profile.Pets, &profile.FoodPref,
		&profile.IsBroker,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *Handler) CreateProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		Name      string `json:"name" binding:"required"`
		Age       int    `json:"age" binding:"required"`
		Gender    string `json:"gender" binding:"required"`
		Location  string `json:"location" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}

	if len(req.Name) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name too long (max 100 characters)"})
		return
	}
	if req.Age < 18 || req.Age > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "age must be between 18 and 120"})
		return
	}
	if len(req.Location) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "location too long (max 200 characters)"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO profiles (user_id, name, age, gender, location)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, userID, req.Name, req.Age, req.Gender, req.Location).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create profile"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Validate field lengths
	for key, val := range req {
		if s, ok := val.(string); ok {
			if key == "name" && len(s) > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "name too long (max 100 characters)"})
				return
			}
			if key == "location" && len(s) > 200 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "location too long (max 200 characters)"})
				return
			}
			if len(s) > 500 {
				c.JSON(http.StatusBadRequest, gin.H{"error": key + " too long"})
				return
			}
		}
	}

	// Map JSON keys to DB columns
	fieldMap := map[string]string{
		"smoking":       "smoking",
		"drinking":      "drinking",
		"cleanliness":   "cleanliness",
		"sleepSchedule": "sleep_schedule",
		"workSchedule":  "work_schedule",
		"pets":          "pets",
		"foodPreference": "food_preference",
		"name":          "name",
		"location":      "location",
		"isBroker":      "is_broker",
	}

	for jsonKey, val := range req {
		col, ok := fieldMap[jsonKey]
		if !ok {
			continue
		}
		// SAFE: col comes from fieldMap whitelist above — never user input
		_, err := h.db.Exec("UPDATE profiles SET "+col+" = $1 WHERE user_id = $2", val, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

var avatarExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

func (h *Handler) UploadAvatar(c *gin.Context) {
	userID := c.GetString("userId")

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 5MB)"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !avatarExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only jpg, png, webp allowed"})
		return
	}

	// Validate actual file content type
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot read file"})
		return
	}
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	f.Close()
	contentType := http.DetectContentType(buf[:n])
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image file"})
		return
	}

	uploadDir := filepath.Join("uploads", "avatars")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}

	// Delete old avatar file if exists
	var oldAvatar sql.NullString
	h.db.QueryRow(`SELECT avatar FROM profiles WHERE user_id = $1`, userID).Scan(&oldAvatar)
	if oldAvatar.Valid && oldAvatar.String != "" {
		os.Remove(filepath.Join("uploads", oldAvatar.String))
	}

	b := make([]byte, 16)
	rand.Read(b)
	filename := hex.EncodeToString(b) + ext
	relPath := filepath.Join("avatars", filename)
	fullPath := filepath.Join("uploads", relPath)

	if err := c.SaveUploadedFile(file, fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	_, err = h.db.Exec(`UPDATE profiles SET avatar = $1 WHERE user_id = $2`, relPath, userID)
	if err != nil {
		os.Remove(fullPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"avatar": "/uploads/" + relPath})
}
