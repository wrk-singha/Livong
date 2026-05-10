package rent

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateGroup creates a new rent group, optionally linked to a listing
func (h *Handler) CreateGroup(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		ListingID       string `json:"listingId"`
		Name            string `json:"name"`
		TotalRent       int    `json:"totalRent" binding:"required"`
		DueDay          int    `json:"dueDay"`
		BaseRent        int    `json:"baseRent"`
		CommissionType  string `json:"commissionType"`
		CommissionValue int    `json:"commissionValue"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.TotalRent <= 0 || req.TotalRent > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rent amount"})
		return
	}
	if req.DueDay < 1 || req.DueDay > 28 {
		req.DueDay = 1
	}
	if len(req.Name) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name too long"})
		return
	}

	// Standalone group (no listing) requires a name
	if req.ListingID == "" && req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required for standalone rent groups"})
		return
	}

	// Commission validation
	var baseRent interface{} = nil
	var commType interface{} = nil
	var commValue interface{} = nil

	if req.CommissionType != "" {
		// Verify user is a broker
		var isBroker bool
		h.db.QueryRow(`SELECT COALESCE(is_broker, false) FROM profiles WHERE user_id = $1`, userID).Scan(&isBroker)
		if !isBroker {
			c.JSON(http.StatusForbidden, gin.H{"error": "only brokers can set commission"})
			return
		}
		if req.CommissionType != "percentage" && req.CommissionType != "flat" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "commission type must be 'percentage' or 'flat'"})
			return
		}
		if req.CommissionValue <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "commission value must be positive"})
			return
		}
		if req.CommissionType == "percentage" && req.CommissionValue > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "commission percentage cannot exceed 100"})
			return
		}
		if req.BaseRent <= 0 || req.BaseRent > 10000000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid base rent amount"})
			return
		}
		if req.BaseRent >= req.TotalRent {
			c.JSON(http.StatusBadRequest, gin.H{"error": "base rent must be less than total rent"})
			return
		}
		baseRent = req.BaseRent
		commType = req.CommissionType
		commValue = req.CommissionValue
	}

	role := "tenant"
	var listingID interface{} = nil

	if req.ListingID != "" {
		var listingOwner string
		err := h.db.QueryRow(`SELECT user_id FROM listings WHERE id = $1`, req.ListingID).Scan(&listingOwner)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "listing not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify listing"})
			return
		}
		listingID = req.ListingID
		if listingOwner == userID {
			role = "owner"
		}
	}

	if commType != nil {
		role = "broker"
	}

	var id string
	err := h.db.QueryRow(`INSERT INTO rent_groups (listing_id, name, total_rent, due_day, created_by, base_rent, commission_type, commission_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		listingID, req.Name, req.TotalRent, req.DueDay, userID, baseRent, commType, commValue).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "a rent group already exists for this listing"})
		return
	}

	// Auto-add creator as a member
	h.db.Exec(`INSERT INTO rent_members (rent_group_id, user_id, share_amount, role) VALUES ($1, $2, $3, $4)`,
		id, userID, 0, role)

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// GetGroups returns all rent groups the user belongs to
func (h *Handler) GetGroups(c *gin.Context) {
	userID := c.GetString("userId")
	now := time.Now()
	currentMonth := fmt.Sprintf("%d-%02d", now.Year(), now.Month())

	rows, err := h.db.Query(`
		SELECT rg.id, rg.listing_id, rg.name, rg.total_rent, rg.due_day, rg.created_by,
			l.title, l.location,
			(SELECT COUNT(*) FROM rent_members WHERE rent_group_id = rg.id),
			(SELECT COUNT(*) FROM rent_payments WHERE rent_group_id = rg.id AND month = $2 AND receiver_confirmed = true),
			rg.base_rent, rg.commission_type, rg.commission_value
		FROM rent_groups rg
		JOIN rent_members rm ON rm.rent_group_id = rg.id AND rm.user_id = $1
		LEFT JOIN listings l ON l.id = rg.listing_id
		ORDER BY rg.created_at DESC
	`, userID, currentMonth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch rent groups"})
		return
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var id, createdBy string
		var listingID, name, listingTitle, listingLocation, commType sql.NullString
		var baseRent, commValue sql.NullInt64
		var totalRent, dueDay, memberCount, paidCount int

		if err := rows.Scan(&id, &listingID, &name, &totalRent, &dueDay, &createdBy,
			&listingTitle, &listingLocation, &memberCount, &paidCount,
			&baseRent, &commType, &commValue); err != nil {
			continue
		}

		overdue := now.Day() > dueDay && paidCount < memberCount

		g := map[string]interface{}{
			"id":          id,
			"totalRent":   totalRent,
			"dueDay":      dueDay,
			"createdBy":   createdBy,
			"memberCount": memberCount,
			"paidCount":   paidCount,
			"overdue":     overdue,
			"month":       currentMonth,
		}
		if listingID.Valid {
			g["listingId"] = listingID.String
		}
		if name.Valid && name.String != "" {
			g["name"] = name.String
		}
		if listingTitle.Valid {
			g["listingTitle"] = listingTitle.String
		}
		if listingLocation.Valid {
			g["listingLocation"] = listingLocation.String
		}
		// Only show commission info to the broker (creator)
		if commType.Valid && createdBy == userID {
			g["baseRent"] = baseRent.Int64
			g["commissionType"] = commType.String
			g["commissionValue"] = commValue.Int64
			if commType.String == "percentage" {
				g["commissionAmount"] = int(baseRent.Int64) * int(commValue.Int64) / 100
			} else {
				g["commissionAmount"] = commValue.Int64
			}
		}

		groups = append(groups, g)
	}

	c.JSON(http.StatusOK, groups)
}

// GetGroup returns a single rent group with members and current month payments
func (h *Handler) GetGroup(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	if !h.isMember(groupID, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you are not a member of this group"})
		return
	}

	// Group info
	var createdBy string
	var listingID, name, commType sql.NullString
	var baseRent, commValue sql.NullInt64
	var totalRent, dueDay int
	var createdAt time.Time
	err := h.db.QueryRow(`
		SELECT rg.id, rg.listing_id, rg.name, rg.total_rent, rg.due_day, rg.created_by, rg.created_at,
			rg.base_rent, rg.commission_type, rg.commission_value
		FROM rent_groups rg WHERE rg.id = $1
	`, groupID).Scan(&groupID, &listingID, &name, &totalRent, &dueDay, &createdBy, &createdAt,
		&baseRent, &commType, &commValue)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch group"})
		return
	}

	// Members with profiles
	memberRows, err := h.db.Query(`
		SELECT rm.user_id, rm.share_amount, rm.role, COALESCE(p.name, 'Unknown')
		FROM rent_members rm
		LEFT JOIN profiles p ON p.user_id = rm.user_id
		WHERE rm.rent_group_id = $1
		ORDER BY rm.created_at
	`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch members"})
		return
	}
	defer memberRows.Close()

	now := time.Now()
	currentMonth := fmt.Sprintf("%d-%02d", now.Year(), now.Month())

	var members []map[string]interface{}
	for memberRows.Next() {
		var mUserID, role, memberName string
		var shareAmount int
		if err := memberRows.Scan(&mUserID, &shareAmount, &role, &memberName); err != nil {
			continue
		}

		// Check current month payment status for this member
		var paymentID sql.NullString
		var payerConfirmed, receiverConfirmed bool
		h.db.QueryRow(`
			SELECT id, payer_confirmed, receiver_confirmed
			FROM rent_payments WHERE rent_group_id = $1 AND payer_id = $2 AND month = $3
		`, groupID, mUserID, currentMonth).Scan(&paymentID, &payerConfirmed, &receiverConfirmed)

		status := "unpaid"
		if paymentID.Valid {
			if receiverConfirmed {
				status = "verified"
			} else {
				status = "pending"
			}
		}

		m := map[string]interface{}{
			"userId":      mUserID,
			"name":        memberName,
			"shareAmount": shareAmount,
			"role":        role,
			"paymentStatus": status,
		}
		if paymentID.Valid {
			m["paymentId"] = paymentID.String
		}
		members = append(members, m)
	}

	// Listing info (only if linked to a listing)
	var listingTitle, listingLocation sql.NullString
	if listingID.Valid {
		h.db.QueryRow(`SELECT title, location FROM listings WHERE id = $1`, listingID.String).Scan(&listingTitle, &listingLocation)
	}

	result := gin.H{
		"id":        groupID,
		"totalRent": totalRent,
		"dueDay":    dueDay,
		"createdBy": createdBy,
		"createdAt": createdAt,
		"members":   members,
		"month":     currentMonth,
		"overdue":   now.Day() > dueDay,
	}
	if listingID.Valid {
		result["listingId"] = listingID.String
	}
	if name.Valid && name.String != "" {
		result["name"] = name.String
	}
	if listingTitle.Valid {
		result["listingTitle"] = listingTitle.String
	}
	if listingLocation.Valid {
		result["listingLocation"] = listingLocation.String
	}
	// Only show commission info to the broker (creator)
	if commType.Valid && createdBy == userID {
		result["baseRent"] = baseRent.Int64
		result["commissionType"] = commType.String
		result["commissionValue"] = commValue.Int64
		if commType.String == "percentage" {
			result["commissionAmount"] = int(baseRent.Int64) * int(commValue.Int64) / 100
		} else {
			result["commissionAmount"] = commValue.Int64
		}
	}

	c.JSON(http.StatusOK, result)
}

// DeleteGroup deletes a rent group (creator only)
func (h *Handler) DeleteGroup(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	var createdBy string
	err := h.db.QueryRow(`SELECT created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if createdBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the group creator can delete it"})
		return
	}

	h.db.Exec(`DELETE FROM rent_groups WHERE id = $1`, groupID)
	c.JSON(http.StatusOK, gin.H{"message": "rent group deleted"})
}
