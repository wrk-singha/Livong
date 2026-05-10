package rent

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

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
