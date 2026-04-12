package plan

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

func (h *Handler) GetPlan(c *gin.Context) {
	userId := c.GetString("userId")

	var plan string
	err := h.db.QueryRow(`SELECT COALESCE(plan, 'free') FROM users WHERE id = $1`, userId).Scan(&plan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": plan})
}

func (h *Handler) UpdatePlan(c *gin.Context) {
	userId := c.GetString("userId")

	var req struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	allowed := map[string]bool{"free": true, "basic": true, "pro": true}
	if !allowed[req.Plan] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan"})
		return
	}

	_, err := h.db.Exec(`UPDATE users SET plan = $1 WHERE id = $2`, req.Plan, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": req.Plan})
}
