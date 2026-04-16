package rent

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

var monthRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

// isMember checks if user belongs to a rent group
func (h *Handler) isMember(groupID, userID string) bool {
	var exists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM rent_members WHERE rent_group_id = $1 AND user_id = $2)`, groupID, userID).Scan(&exists)
	return exists
}

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

// RecordPayment records a rent payment for the current user
func (h *Handler) RecordPayment(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	if !h.isMember(groupID, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you are not a member of this group"})
		return
	}

	var req struct {
		Amount        int    `json:"amount" binding:"required"`
		Month         string `json:"month" binding:"required"`
		PaymentMethod string `json:"paymentMethod"`
		Note          string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Amount <= 0 || req.Amount > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid amount"})
		return
	}
	if !monthRegex.MatchString(req.Month) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid month format, use YYYY-MM"})
		return
	}
	if len(req.Note) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "note too long"})
		return
	}

	validMethods := map[string]bool{"online": true, "offline": true, "upi": true}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "offline"
	}
	if !validMethods[req.PaymentMethod] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment method"})
		return
	}

	var id string
	err := h.db.QueryRow(`
		INSERT INTO rent_payments (rent_group_id, payer_id, amount, month, payment_method, note)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
	`, groupID, userID, req.Amount, req.Month, req.PaymentMethod, req.Note).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "payment already recorded for this month"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// GetPayments returns payment history for a rent group
func (h *Handler) GetPayments(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	if !h.isMember(groupID, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you are not a member of this group"})
		return
	}

	month := c.Query("month")
	query := `
		SELECT rp.id, rp.payer_id, rp.amount, rp.month, rp.payment_method, rp.note,
			rp.payer_confirmed, rp.receiver_confirmed, rp.confirmed_by, rp.confirmed_at,
			rp.created_at, COALESCE(p.name, 'Unknown')
		FROM rent_payments rp
		LEFT JOIN profiles p ON p.user_id = rp.payer_id
		WHERE rp.rent_group_id = $1`
	args := []interface{}{groupID}

	if month != "" && monthRegex.MatchString(month) {
		query += ` AND rp.month = $2`
		args = append(args, month)
	}
	query += ` ORDER BY rp.month DESC, rp.created_at DESC`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch payments"})
		return
	}
	defer rows.Close()

	var payments []map[string]interface{}
	for rows.Next() {
		var id, payerID, payMonth, method, payerName string
		var amount int
		var note sql.NullString
		var payerConfirmed, receiverConfirmed bool
		var confirmedBy sql.NullString
		var confirmedAt sql.NullTime
		var createdAt time.Time

		if err := rows.Scan(&id, &payerID, &amount, &payMonth, &method, &note,
			&payerConfirmed, &receiverConfirmed, &confirmedBy, &confirmedAt,
			&createdAt, &payerName); err != nil {
			continue
		}

		status := "pending"
		if receiverConfirmed {
			status = "verified"
		}

		p := map[string]interface{}{
			"id":            id,
			"payerId":       payerID,
			"payerName":     payerName,
			"amount":        amount,
			"month":         payMonth,
			"paymentMethod": method,
			"status":        status,
			"createdAt":     createdAt,
		}
		if note.Valid {
			p["note"] = note.String
		}
		if confirmedAt.Valid {
			p["confirmedAt"] = confirmedAt.Time
		}

		payments = append(payments, p)
	}

	c.JSON(http.StatusOK, payments)
}

// VerifyPayment confirms a payment by a counterparty
func (h *Handler) VerifyPayment(c *gin.Context) {
	userID := c.GetString("userId")
	paymentID := c.Param("paymentId")

	// Get the payment and its group
	var groupID, payerID string
	var receiverConfirmed bool
	err := h.db.QueryRow(`
		SELECT rent_group_id, payer_id, receiver_confirmed
		FROM rent_payments WHERE id = $1
	`, paymentID).Scan(&groupID, &payerID, &receiverConfirmed)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "payment not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch payment"})
		return
	}

	// Payer cannot verify their own payment
	if payerID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you cannot verify your own payment"})
		return
	}

	// Must be a member of the group
	if !h.isMember(groupID, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you are not a member of this group"})
		return
	}

	if receiverConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment already verified"})
		return
	}

	_, err = h.db.Exec(`
		UPDATE rent_payments SET receiver_confirmed = true, confirmed_by = $1, confirmed_at = NOW()
		WHERE id = $2
	`, userID, paymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify payment"})
		return
	}

	// Auto-create commission record if all members have verified payments this month
	go h.tryCreateCommission(groupID)

	c.JSON(http.StatusOK, gin.H{"message": "payment verified"})
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

	var users []map[string]interface{}
	for rows.Next() {
		var id, name string
		if rows.Scan(&id, &name) == nil {
			users = append(users, map[string]interface{}{"id": id, "name": name})
		}
	}

	c.JSON(http.StatusOK, users)
}

// tryCreateCommission auto-creates a commission record when all members paid
func (h *Handler) tryCreateCommission(groupID string) {
	now := time.Now()
	currentMonth := fmt.Sprintf("%d-%02d", now.Year(), now.Month())

	var commType sql.NullString
	var baseRent, commValue sql.NullInt64
	var createdBy string
	h.db.QueryRow(`SELECT commission_type, base_rent, commission_value, created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&commType, &baseRent, &commValue, &createdBy)
	if !commType.Valid {
		return
	}

	// Count members (excluding the broker) and verified payments
	var memberCount, verifiedCount int
	h.db.QueryRow(`SELECT COUNT(*) FROM rent_members WHERE rent_group_id = $1 AND role != 'broker'`, groupID).Scan(&memberCount)
	h.db.QueryRow(`SELECT COUNT(*) FROM rent_payments WHERE rent_group_id = $1 AND month = $2 AND receiver_confirmed = true`, groupID, currentMonth).Scan(&verifiedCount)

	if memberCount == 0 || verifiedCount < memberCount {
		return
	}

	// Calculate commission
	var amount int
	if commType.String == "percentage" {
		amount = int(baseRent.Int64) * int(commValue.Int64) / 100
	} else {
		amount = int(commValue.Int64)
	}

	// Insert if not exists (UNIQUE constraint will prevent duplicates)
	h.db.Exec(`INSERT INTO rent_commissions (rent_group_id, broker_id, month, amount) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
		groupID, createdBy, currentMonth, amount)
}

// GetCommissions returns commission records for a rent group (broker only)
func (h *Handler) GetCommissions(c *gin.Context) {
	userID := c.GetString("userId")
	groupID := c.Param("id")

	var createdBy string
	err := h.db.QueryRow(`SELECT created_by FROM rent_groups WHERE id = $1`, groupID).Scan(&createdBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "rent group not found"})
		return
	}
	if createdBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the broker can view commissions"})
		return
	}

	rows, err := h.db.Query(`
		SELECT id, month, amount, status, collected_at, created_at
		FROM rent_commissions WHERE rent_group_id = $1
		ORDER BY month DESC
	`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch commissions"})
		return
	}
	defer rows.Close()

	var commissions []map[string]interface{}
	for rows.Next() {
		var id, month, status string
		var amount int
		var collectedAt sql.NullTime
		var createdAt time.Time
		if rows.Scan(&id, &month, &amount, &status, &collectedAt, &createdAt) != nil {
			continue
		}
		c := map[string]interface{}{
			"id":        id,
			"month":     month,
			"amount":    amount,
			"status":    status,
			"createdAt": createdAt,
		}
		if collectedAt.Valid {
			c["collectedAt"] = collectedAt.Time
		}
		commissions = append(commissions, c)
	}

	c.JSON(http.StatusOK, commissions)
}

// CollectCommission marks a commission as collected (broker only)
func (h *Handler) CollectCommission(c *gin.Context) {
	userID := c.GetString("userId")
	commissionID := c.Param("commissionId")

	var brokerID, status string
	err := h.db.QueryRow(`SELECT broker_id, status FROM rent_commissions WHERE id = $1`, commissionID).Scan(&brokerID, &status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "commission not found"})
		return
	}
	if brokerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the broker can collect commission"})
		return
	}
	if status == "collected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "commission already collected"})
		return
	}

	_, err = h.db.Exec(`UPDATE rent_commissions SET status = 'collected', collected_at = NOW() WHERE id = $1`, commissionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to collect commission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "commission collected"})
}
