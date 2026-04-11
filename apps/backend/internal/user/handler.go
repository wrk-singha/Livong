package user

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

func (h *Handler) GetProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var profile struct {
		ID            string  `json:"id"`
		Name          *string `json:"name"`
		Age           *int    `json:"age"`
		Gender        *string `json:"gender"`
		BudgetMin     *int    `json:"budgetMin"`
		BudgetMax     *int    `json:"budgetMax"`
		Location      *string `json:"location"`
		Smoking       *string `json:"smoking"`
		Drinking      *string `json:"drinking"`
		Cleanliness   *string `json:"cleanliness"`
		SleepSchedule *string `json:"sleepSchedule"`
		WorkSchedule  *string `json:"workSchedule"`
		Pets          *string `json:"pets"`
		FoodPref      *string `json:"foodPreference"`
	}

	err := h.db.QueryRow(`
		SELECT id, name, age, gender, budget_min, budget_max, location,
			smoking, drinking, cleanliness, sleep_schedule, work_schedule, pets, food_preference
		FROM profiles WHERE user_id = $1
	`, userID).Scan(
		&profile.ID, &profile.Name, &profile.Age, &profile.Gender,
		&profile.BudgetMin, &profile.BudgetMax, &profile.Location,
		&profile.Smoking, &profile.Drinking, &profile.Cleanliness,
		&profile.SleepSchedule, &profile.WorkSchedule, &profile.Pets, &profile.FoodPref,
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
		BudgetMin int    `json:"budgetMin" binding:"required"`
		BudgetMax int    `json:"budgetMax" binding:"required"`
		Location  string `json:"location" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO profiles (user_id, name, age, gender, budget_min, budget_max, location)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, userID, req.Name, req.Age, req.Gender, req.BudgetMin, req.BudgetMax, req.Location).Scan(&id)

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
		"budgetMin":     "budget_min",
		"budgetMax":     "budget_max",
		"location":      "location",
	}

	for jsonKey, val := range req {
		col, ok := fieldMap[jsonKey]
		if !ok {
			continue
		}
		_, err := h.db.Exec("UPDATE profiles SET "+col+" = $1 WHERE user_id = $2", val, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}
