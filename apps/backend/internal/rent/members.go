package rent

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AddMember adds a user to a rent group
func (h *Handler) AddMember(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	// Only creator can add members
	var createdBy string
	err := h.db.QueryRow(`SELECT created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if createdBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the group creator can add members"})
		return
	}

	var req struct {
		UserID      string `json:"userId" binding:"required"`
		ShareAmount int    `json:"shareAmount" binding:"required"`
		Role        string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.ShareAmount <= 0 || req.ShareAmount > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid share amount"})
		return
	}
	if req.Role == "" {
		req.Role = "tenant"
	}
	validRoles := map[string]bool{"owner": true, "tenant": true}
	if !validRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	// Verify the user being added exists
	var exists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, req.UserID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = h.db.Exec(`INSERT INTO rent_members (rent_group_id, user_id, share_amount, role) VALUES ($1, $2, $3, $4)`,
		groupID, req.UserID, req.ShareAmount, req.Role)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user already in group"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "member added"})
}

// RemoveMember removes a user from a rent group
func (h *Handler) RemoveMember(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")
	targetUserID := c.Param("userId")

	var createdBy string
	err := h.db.QueryRow(`SELECT created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}

	// Creator or the member themselves can remove
	if createdBy != userID && targetUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	// Cannot remove the creator
	if targetUserID == createdBy {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove the group creator"})
		return
	}

	result, err := h.db.Exec(`DELETE FROM rent_members WHERE rent_group_id = $1 AND user_id = $2`, groupID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}

// UpdateMember updates a member's share amount
func (h *Handler) UpdateMember(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")
	targetUserID := c.Param("userId")

	var createdBy string
	err := h.db.QueryRow(`SELECT created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if createdBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the group creator can update shares"})
		return
	}

	var req struct {
		ShareAmount int `json:"shareAmount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.ShareAmount <= 0 || req.ShareAmount > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid share amount"})
		return
	}

	result, err := h.db.Exec(`UPDATE rent_members SET share_amount = $1 WHERE rent_group_id = $2 AND user_id = $3`,
		req.ShareAmount, groupID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update member"})
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "share updated"})
}

// GetMatchedUsers returns users matched to the listing (for adding members)
func (h *Handler) GetMatchedUsers(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	// Verify user is group creator
	var listingID sql.NullString
	var createdBy string
	err := h.db.QueryRow(`SELECT listing_id, created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&listingID, &createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if createdBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the group creator can view matched users"})
		return
	}

	// Standalone group — no listing to pull matches from
	if !listingID.Valid {
		c.JSON(http.StatusOK, []map[string]interface{}{})
		return
	}

	rows, err := h.db.Query(`
		SELECT DISTINCT u.id, COALESCE(p.name, 'Unknown')
		FROM matches m
		JOIN users u ON u.id = CASE WHEN m.user1_id = $2 THEN m.user2_id ELSE m.user1_id END
		LEFT JOIN profiles p ON p.user_id = u.id
		WHERE m.listing_id = $1 AND (m.user1_id = $2 OR m.user2_id = $2)
		AND u.id NOT IN (SELECT user_id FROM rent_members WHERE rent_group_id = $3)
	`, listingID.String, userID, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch matched users"})
		return
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var id, name string
		if rows.Scan(&id, &name) == nil {
			users = append(users, map[string]interface{}{"id": id, "name": name})
		}
	}

	c.JSON(http.StatusOK, users)
}
