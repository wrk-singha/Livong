package rent

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

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

	commissions := []map[string]interface{}{}
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
