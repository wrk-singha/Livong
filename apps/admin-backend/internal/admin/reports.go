package admin

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func parseIntDefault(s string, d int) int {
	if s == "" {
		return d
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return d
	}
	return n
}

// GetReports returns the report queue, optionally filtered by status.
//
// Query params:
//   - status: "pending" (default) | "reviewed" | "dismissed" | "actioned" | "all"
//   - limit:  default 50, max 200
//   - page:   1-indexed, default 1
//
// Joins reporter profile name + best-effort target name (for listing/profile
// targets). Message targets only carry the row id — admins can drill in
// separately if needed.
func (h *Handler) GetReports(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")
	limit := parseIntDefault(c.Query("limit"), 50)
	if limit > 200 {
		limit = 200
	}
	page := parseIntDefault(c.Query("page"), 1)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	where := ""
	if status != "all" {
		where = "WHERE r.status = $1"
		args = append(args, status)
	}

	// Total count for pagination
	var total int
	if status == "all" {
		h.db.QueryRow("SELECT COUNT(*) FROM reports").Scan(&total)
	} else {
		h.db.QueryRow("SELECT COUNT(*) FROM reports WHERE status = $1", status).Scan(&total)
	}

	args = append(args, limit, offset)
	limitArg := "$" + itoa(len(args)-1)
	offsetArg := "$" + itoa(len(args))

	q := `
		SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason,
			r.details, r.status, r.created_at, r.reviewed_at,
			COALESCE(rp.name, 'Unknown') AS reporter_name,
			-- Best-effort target name: profiles for profile target, listings.title for listing target
			CASE r.target_type
				WHEN 'profile' THEN COALESCE((SELECT name FROM profiles WHERE user_id = r.target_id), 'Unknown')
				WHEN 'listing' THEN COALESCE((SELECT title FROM listings WHERE id = r.target_id), '(deleted)')
				ELSE ''
			END AS target_name
		FROM reports r
		LEFT JOIN profiles rp ON rp.user_id = r.reporter_id
		` + where + `
		ORDER BY r.created_at DESC
		LIMIT ` + limitArg + ` OFFSET ` + offsetArg

	rows, err := h.db.Query(q, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reports"})
		return
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		var id, reporterID, targetType, targetID, reason, statusVal, reporterName, targetName string
		var details sql.NullString
		var createdAt, reviewedAt sql.NullTime
		if err := rows.Scan(&id, &reporterID, &targetType, &targetID, &reason, &details, &statusVal, &createdAt, &reviewedAt, &reporterName, &targetName); err != nil {
			continue
		}
		item := map[string]interface{}{
			"id":           id,
			"reporterId":   reporterID,
			"reporterName": reporterName,
			"targetType":   targetType,
			"targetId":     targetID,
			"targetName":   targetName,
			"reason":       reason,
			"status":       statusVal,
		}
		if details.Valid {
			item["details"] = details.String
		}
		if createdAt.Valid {
			item["createdAt"] = createdAt.Time
		}
		if reviewedAt.Valid {
			item["reviewedAt"] = reviewedAt.Time
		}
		out = append(out, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  out,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

// UpdateReport — PATCH /admin/reports/:id
// Body: { status: "dismissed" | "actioned" }
// Sets reviewed_at + reviewed_by; reports stay in DB for audit.
func (h *Handler) UpdateReport(c *gin.Context) {
	reportID := c.Param("id")
	adminID := c.GetString("userId")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}
	if req.Status != "dismissed" && req.Status != "actioned" && req.Status != "reviewed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be 'dismissed', 'actioned', or 'reviewed'"})
		return
	}

	res, err := h.db.Exec(`
		UPDATE reports SET status = $1, reviewed_at = NOW(), reviewed_by = $2
		WHERE id = $3 AND status = 'pending'
	`, req.Status, adminID, reportID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update report"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "report not found or already processed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "report " + req.Status})
}

// itoa avoids importing strconv just for one int. (admin/handler.go already
// imports strconv but a separate helper here keeps this file self-contained.)
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	buf := make([]byte, 0, 12)
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
