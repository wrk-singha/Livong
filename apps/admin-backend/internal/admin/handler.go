package admin

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/rohit/livong-admin-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

func AdminAuth(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		var isAdmin bool
		err = db.QueryRow(`SELECT COALESCE(is_admin, false) FROM users WHERE id = $1`, claims.UserID).Scan(&isAdmin)
		if err != nil || !isAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "not an admin"})
			return
		}

		c.Set("userId", claims.UserID)
		c.Next()
	}
}

func (h *Handler) GetStats(c *gin.Context) {
	daysStr := c.Query("days")
	stats := gin.H{}

	var count int

	if daysStr != "" {
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid days parameter"})
			return
		}
		interval := fmt.Sprintf("%d days", days)

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalProfiles"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM listings WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalListings"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM interests WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalInterests"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM matches WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalMatches"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM messages WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalMessages"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM reviews WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalReviews"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM listing_images WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["totalImages"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE is_verified = true AND created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["verifiedUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE plan != 'free' AND created_at > NOW() - $1::INTERVAL`, interval).Scan(&count)
		stats["paidUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`).Scan(&count)
		stats["recentSignups"] = count

		var totalRevenue sql.NullInt64
		h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at > NOW() - $1::INTERVAL`, interval).Scan(&totalRevenue)
		stats["totalRevenue"] = totalRevenue.Int64
		stats["monthRevenue"] = totalRevenue.Int64
	} else {
		h.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
		stats["totalUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM profiles`).Scan(&count)
		stats["totalProfiles"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM listings`).Scan(&count)
		stats["totalListings"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM interests`).Scan(&count)
		stats["totalInterests"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM matches`).Scan(&count)
		stats["totalMatches"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM messages`).Scan(&count)
		stats["totalMessages"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM reviews`).Scan(&count)
		stats["totalReviews"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM listing_images`).Scan(&count)
		stats["totalImages"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE is_verified = true`).Scan(&count)
		stats["verifiedUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE plan != 'free'`).Scan(&count)
		stats["paidUsers"] = count

		h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`).Scan(&count)
		stats["recentSignups"] = count

		var totalRevenue sql.NullInt64
		h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM payments`).Scan(&totalRevenue)
		stats["totalRevenue"] = totalRevenue.Int64

		var monthRevenue sql.NullInt64
		h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at > NOW() - INTERVAL '30 days'`).Scan(&monthRevenue)
		stats["monthRevenue"] = monthRevenue.Int64
	}

	c.JSON(http.StatusOK, stats)
}

func parsePagination(c *gin.Context) (page, limit, offset int) {
	page = 1
	limit = 50
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 && v <= 200 {
		limit = v
	}
	offset = (page - 1) * limit
	return
}

func (h *Handler) GetUsers(c *gin.Context) {
	page, limit, offset := parsePagination(c)

	var total int
	h.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&total)

	rows, err := h.db.Query(`
		SELECT u.id, u.phone, u.plan, u.is_verified, u.created_at,
			p.name, p.age, p.gender, p.location,
			p.smoking, p.drinking, p.cleanliness, p.sleep_schedule, p.work_schedule,
			p.pets, p.food_preference,
			(SELECT COUNT(*) FROM listings WHERE user_id = u.id),
			(SELECT COUNT(*) FROM interests WHERE sender_id = u.id),
			(SELECT COUNT(*) FROM matches WHERE user1_id = u.id OR user2_id = u.id)
		FROM users u
		LEFT JOIN profiles p ON p.user_id = u.id
		ORDER BY u.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, phone, plan string
		var verified bool
		var createdAt sql.NullTime
		var name, gender, location sql.NullString
		var age sql.NullInt64
		var smoking, drinking, cleanliness, sleepSchedule, workSchedule, pets, foodPref sql.NullString
		var listingCount, interestCount, matchCount int

		if err := rows.Scan(&id, &phone, &plan, &verified, &createdAt,
			&name, &age, &gender, &location,
			&smoking, &drinking, &cleanliness, &sleepSchedule, &workSchedule,
			&pets, &foodPref,
			&listingCount, &interestCount, &matchCount); err != nil {
			continue
		}

		u := map[string]interface{}{
			"id":            id,
			"phone":         phone,
			"plan":          plan,
			"verified":      verified,
			"listingCount":  listingCount,
			"interestCount": interestCount,
			"matchCount":    matchCount,
		}
		if createdAt.Valid {
			u["createdAt"] = createdAt.Time
		}
		if name.Valid {
			u["name"] = name.String
		}
		if age.Valid {
			u["age"] = age.Int64
		}
		if gender.Valid {
			u["gender"] = gender.String
		}
		if location.Valid {
			u["location"] = location.String
		}
		if smoking.Valid {
			u["smoking"] = smoking.String
		}
		if drinking.Valid {
			u["drinking"] = drinking.String
		}
		if cleanliness.Valid {
			u["cleanliness"] = cleanliness.String
		}
		if sleepSchedule.Valid {
			u["sleepSchedule"] = sleepSchedule.String
		}
		if workSchedule.Valid {
			u["workSchedule"] = workSchedule.String
		}
		if pets.Valid {
			u["pets"] = pets.String
		}
		if foodPref.Valid {
			u["foodPref"] = foodPref.String
		}
		users = append(users, u)
	}

	c.JSON(http.StatusOK, gin.H{"data": users, "total": total, "page": page, "limit": limit})
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Verified *bool   `json:"verified"`
		Plan     *string `json:"plan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Verified != nil {
		h.db.Exec(`UPDATE users SET is_verified = $1 WHERE id = $2`, *req.Verified, id)
	}
	if req.Plan != nil {
		h.db.Exec(`UPDATE users SET plan = $1 WHERE id = $2`, *req.Plan, id)
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	h.db.Exec(`DELETE FROM messages WHERE sender_id = $1 OR match_id IN (SELECT id FROM matches WHERE user1_id = $1 OR user2_id = $1)`, id)
	h.db.Exec(`DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1`, id)
	h.db.Exec(`DELETE FROM reviews WHERE reviewer_id = $1`, id)
	h.db.Exec(`DELETE FROM interests WHERE sender_id = $1 OR receiver_id = $1`, id)
	h.db.Exec(`DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id = $1)`, id)
	h.db.Exec(`DELETE FROM listings WHERE user_id = $1`, id)
	h.db.Exec(`DELETE FROM profiles WHERE user_id = $1`, id)
	h.db.Exec(`DELETE FROM users WHERE id = $1`, id)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetListings(c *gin.Context) {
	page, limit, offset := parsePagination(c)

	var total int
	h.db.QueryRow(`SELECT COUNT(*) FROM listings`).Scan(&total)

	rows, err := h.db.Query(`
		SELECT l.id, l.user_id, l.title, l.description, l.rent, l.location,
			l.property_type, l.available_from, l.created_at,
			p.name,
			(SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id),
			(SELECT COUNT(*) FROM interests WHERE listing_id = l.id),
			(SELECT COUNT(*) FROM reviews WHERE listing_id = l.id),
			(SELECT AVG(rating) FROM reviews WHERE listing_id = l.id)
		FROM listings l
		LEFT JOIN profiles p ON p.user_id = l.user_id
		ORDER BY l.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
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
		var availableFrom, createdAt sql.NullTime
		var ownerName sql.NullString
		var imageCount, interestCount, reviewCount int
		var avgRating sql.NullFloat64

		if err := rows.Scan(&id, &userID, &title, &description, &rent, &location,
			&propertyType, &availableFrom, &createdAt, &ownerName,
			&imageCount, &interestCount, &reviewCount, &avgRating); err != nil {
			continue
		}

		l := map[string]interface{}{
			"id":            id,
			"userId":        userID,
			"title":         title,
			"description":   description.String,
			"rent":          rent,
			"location":      location,
			"propertyType":  propertyType,
			"imageCount":    imageCount,
			"interestCount": interestCount,
			"reviewCount":   reviewCount,
		}
		if availableFrom.Valid {
			l["availableFrom"] = availableFrom.Time
		}
		if createdAt.Valid {
			l["createdAt"] = createdAt.Time
		}
		if ownerName.Valid {
			l["ownerName"] = ownerName.String
		}
		if avgRating.Valid {
			l["avgRating"] = avgRating.Float64
		}
		listings = append(listings, l)
	}

	c.JSON(http.StatusOK, gin.H{"data": listings, "total": total, "page": page, "limit": limit})
}

func (h *Handler) DeleteListing(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM reviews WHERE listing_id = $1`, id)
	h.db.Exec(`DELETE FROM listing_images WHERE listing_id = $1`, id)
	h.db.Exec(`DELETE FROM interests WHERE listing_id = $1`, id)
	h.db.Exec(`DELETE FROM listings WHERE id = $1`, id)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetReviews(c *gin.Context) {
	page, limit, offset := parsePagination(c)

	var total int
	h.db.QueryRow(`SELECT COUNT(*) FROM reviews`).Scan(&total)

	rows, err := h.db.Query(`
		SELECT r.id, r.reviewer_id, r.listing_id, r.rating, r.comment, r.created_at,
			p1.name AS reviewer_name,
			l.title AS listing_title,
			p2.name AS listing_owner_name
		FROM reviews r
		LEFT JOIN profiles p1 ON p1.user_id = r.reviewer_id
		LEFT JOIN listings l ON l.id = r.listing_id
		LEFT JOIN profiles p2 ON p2.user_id = l.user_id
		ORDER BY r.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reviews"})
		return
	}
	defer rows.Close()

	var reviews []map[string]interface{}
	for rows.Next() {
		var id, reviewerID, listingID string
		var rating int
		var comment sql.NullString
		var createdAt sql.NullTime
		var reviewerName, listingTitle, ownerName sql.NullString

		if err := rows.Scan(&id, &reviewerID, &listingID, &rating, &comment, &createdAt,
			&reviewerName, &listingTitle, &ownerName); err != nil {
			continue
		}

		r := map[string]interface{}{
			"id":         id,
			"reviewerId": reviewerID,
			"listingId":  listingID,
			"rating":     rating,
		}
		if comment.Valid {
			r["comment"] = comment.String
		}
		if createdAt.Valid {
			r["createdAt"] = createdAt.Time
		}
		if reviewerName.Valid {
			r["reviewerName"] = reviewerName.String
		}
		if listingTitle.Valid {
			r["listingTitle"] = listingTitle.String
		}
		if ownerName.Valid {
			r["ownerName"] = ownerName.String
		}
		reviews = append(reviews, r)
	}

	c.JSON(http.StatusOK, gin.H{"data": reviews, "total": total, "page": page, "limit": limit})
}

func (h *Handler) DeleteReview(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM reviews WHERE id = $1`, id)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetMatches(c *gin.Context) {
	page, limit, offset := parsePagination(c)

	var total int
	h.db.QueryRow(`SELECT COUNT(*) FROM matches`).Scan(&total)

	rows, err := h.db.Query(`
		SELECT m.id, m.user1_id, m.user2_id, m.listing_id, m.created_at,
			p1.name, p2.name, l.title,
			(SELECT COUNT(*) FROM messages WHERE match_id = m.id)
		FROM matches m
		LEFT JOIN profiles p1 ON p1.user_id = m.user1_id
		LEFT JOIN profiles p2 ON p2.user_id = m.user2_id
		LEFT JOIN listings l ON l.id = m.listing_id
		ORDER BY m.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch matches"})
		return
	}
	defer rows.Close()

	var matches []map[string]interface{}
	for rows.Next() {
		var id, user1ID, user2ID, listingID string
		var createdAt sql.NullTime
		var user1Name, user2Name, listingTitle sql.NullString
		var messageCount int

		if err := rows.Scan(&id, &user1ID, &user2ID, &listingID, &createdAt,
			&user1Name, &user2Name, &listingTitle, &messageCount); err != nil {
			continue
		}

		m := map[string]interface{}{
			"id":           id,
			"user1Id":      user1ID,
			"user2Id":      user2ID,
			"listingId":    listingID,
			"messageCount": messageCount,
		}
		if createdAt.Valid {
			m["createdAt"] = createdAt.Time
		}
		if user1Name.Valid {
			m["user1Name"] = user1Name.String
		}
		if user2Name.Valid {
			m["user2Name"] = user2Name.String
		}
		if listingTitle.Valid {
			m["listingTitle"] = listingTitle.String
		}
		matches = append(matches, m)
	}

	c.JSON(http.StatusOK, gin.H{"data": matches, "total": total, "page": page, "limit": limit})
}

func (h *Handler) GetInterests(c *gin.Context) {
	page, limit, offset := parsePagination(c)

	var total int
	h.db.QueryRow(`SELECT COUNT(*) FROM interests`).Scan(&total)

	rows, err := h.db.Query(`
		SELECT i.id, i.sender_id, i.receiver_id, i.listing_id, i.status, i.created_at,
			p1.name AS sender_name,
			p2.name AS receiver_name,
			l.title AS listing_title
		FROM interests i
		LEFT JOIN profiles p1 ON p1.user_id = i.sender_id
		LEFT JOIN profiles p2 ON p2.user_id = i.receiver_id
		LEFT JOIN listings l ON l.id = i.listing_id
		ORDER BY i.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interests"})
		return
	}
	defer rows.Close()

	var interests []map[string]interface{}
	for rows.Next() {
		var id, senderID, receiverID, listingID, status string
		var createdAt sql.NullTime
		var senderName, receiverName, listingTitle sql.NullString

		if err := rows.Scan(&id, &senderID, &receiverID, &listingID, &status, &createdAt,
			&senderName, &receiverName, &listingTitle); err != nil {
			continue
		}

		i := map[string]interface{}{
			"id":         id,
			"senderId":   senderID,
			"receiverId": receiverID,
			"listingId":  listingID,
			"status":     status,
		}
		if createdAt.Valid {
			i["createdAt"] = createdAt.Time
		}
		if senderName.Valid {
			i["senderName"] = senderName.String
		}
		if receiverName.Valid {
			i["receiverName"] = receiverName.String
		}
		if listingTitle.Valid {
			i["listingTitle"] = listingTitle.String
		}
		interests = append(interests, i)
	}

	c.JSON(http.StatusOK, gin.H{"data": interests, "total": total, "page": page, "limit": limit})
}

func (h *Handler) GetRevenue(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")
	interval := c.DefaultQuery("interval", "day")

	truncMap := map[string]string{
		"day":   "day",
		"week":  "week",
		"month": "month",
		"year":  "year",
	}
	trunc, ok := truncMap[interval]
	if !ok {
		trunc = "day"
	}

	summary := gin.H{}

	var totalRevenue sql.NullInt64
	h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM payments`).Scan(&totalRevenue)
	summary["totalRevenue"] = totalRevenue.Int64

	var totalPayments int
	h.db.QueryRow(`SELECT COUNT(*) FROM payments`).Scan(&totalPayments)
	summary["totalPayments"] = totalPayments

	var rangeRevenue sql.NullInt64
	var rangePayments int
	if from != "" && to != "" {
		h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`, from, to).Scan(&rangeRevenue)
		h.db.QueryRow(`SELECT COUNT(*) FROM payments WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`, from, to).Scan(&rangePayments)
	} else {
		rangeRevenue = totalRevenue
		rangePayments = totalPayments
	}
	summary["rangeRevenue"] = rangeRevenue.Int64
	summary["rangePayments"] = rangePayments

	planRows, _ := h.db.Query(`
		SELECT plan, COUNT(*), COALESCE(SUM(amount), 0)
		FROM payments
		WHERE ($1::date IS NULL OR created_at >= $1::date)
		  AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))
		GROUP BY plan ORDER BY plan
	`, sqlNull(from), sqlNull(to))
	var byPlan []map[string]interface{}
	if planRows != nil {
		defer planRows.Close()
		for planRows.Next() {
			var plan string
			var cnt int
			var amt int64
			if planRows.Scan(&plan, &cnt, &amt) == nil {
				byPlan = append(byPlan, map[string]interface{}{
					"plan":   plan,
					"count":  cnt,
					"amount": amt,
				})
			}
		}
	}
	summary["byPlan"] = byPlan

	query := `
		SELECT DATE_TRUNC($1, created_at) AS period,
			COUNT(*), COALESCE(SUM(amount), 0)
		FROM payments
		WHERE ($2::date IS NULL OR created_at >= $2::date)
		  AND ($3::date IS NULL OR created_at < ($3::date + INTERVAL '1 day'))
		GROUP BY period ORDER BY period
	`
	rows, _ := h.db.Query(query, trunc, sqlNull(from), sqlNull(to))
	var timeSeries []map[string]interface{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var period sql.NullTime
			var cnt int
			var amt int64
			if rows.Scan(&period, &cnt, &amt) == nil {
				entry := map[string]interface{}{
					"count":  cnt,
					"amount": amt,
				}
				if period.Valid {
					entry["period"] = period.Time
				}
				timeSeries = append(timeSeries, entry)
			}
		}
	}
	summary["timeSeries"] = timeSeries

	recent, _ := h.db.Query(`
		SELECT p.id, p.plan, p.amount, p.created_at, pr.name, u.phone
		FROM payments p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN profiles pr ON pr.user_id = p.user_id
		ORDER BY p.created_at DESC LIMIT 50
	`)
	var recentPayments []map[string]interface{}
	if recent != nil {
		defer recent.Close()
		for recent.Next() {
			var id, plan, phone string
			var amount int
			var createdAt sql.NullTime
			var name sql.NullString
			if recent.Scan(&id, &plan, &amount, &createdAt, &name, &phone) == nil {
				r := map[string]interface{}{
					"id":     id,
					"plan":   plan,
					"amount": amount,
					"phone":  phone,
				}
				if createdAt.Valid {
					r["createdAt"] = createdAt.Time
				}
				if name.Valid {
					r["name"] = name.String
				}
				recentPayments = append(recentPayments, r)
			}
		}
	}
	summary["recentPayments"] = recentPayments

	c.JSON(http.StatusOK, summary)
}

func sqlNull(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (h *Handler) GetAnalytics(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")
	days := c.DefaultQuery("days", "30")

	dateFilter := "created_at > NOW() - ($1 || ' days')::INTERVAL"
	dateArgs := []interface{}{days}
	if from != "" {
		dateFilter = "created_at >= $1::date"
		dateArgs = []interface{}{from}
		if to != "" {
			dateFilter = "created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')"
			dateArgs = []interface{}{from, to}
		}
	}

	result := gin.H{}

	// SAFE: table and extraCols are only ever passed hardcoded literals from the call sites below — never user input
	queryTimeSeries := func(table string, extraCols string, scanFn func(*sql.Rows) map[string]interface{}) []map[string]interface{} {
		q := "SELECT DATE_TRUNC('day', created_at)::date AS d" + extraCols + " FROM " + table + " WHERE " + dateFilter + " GROUP BY d ORDER BY d"
		rows, _ := h.db.Query(q, dateArgs...)
		var out []map[string]interface{}
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				if m := scanFn(rows); m != nil {
					out = append(out, m)
				}
			}
		}
		return out
	}

	countScan := func(rows *sql.Rows) map[string]interface{} {
		var d string
		var cnt int
		if rows.Scan(&d, &cnt) == nil {
			return map[string]interface{}{"date": d, "count": cnt}
		}
		return nil
	}

	result["signupsByDay"] = queryTimeSeries("users", ", COUNT(*)", countScan)
	result["listingsByDay"] = queryTimeSeries("listings", ", COUNT(*)", countScan)
	result["matchesByDay"] = queryTimeSeries("matches", ", COUNT(*)", countScan)
	result["messagesByDay"] = queryTimeSeries("messages", ", COUNT(*)", countScan)

	result["revenueByDay"] = queryTimeSeries("payments", ", COUNT(*), COALESCE(SUM(amount), 0)", func(rows *sql.Rows) map[string]interface{} {
		var d string
		var cnt int
		var amt int64
		if rows.Scan(&d, &cnt, &amt) == nil {
			return map[string]interface{}{"date": d, "count": cnt, "amount": amt}
		}
		return nil
	})

	funnel := gin.H{}
	var totalUsers, totalProfiles, totalListings, totalInterests, totalMatches int
	h.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	h.db.QueryRow(`SELECT COUNT(*) FROM profiles`).Scan(&totalProfiles)
	h.db.QueryRow(`SELECT COUNT(*) FROM listings`).Scan(&totalListings)
	h.db.QueryRow(`SELECT COUNT(*) FROM interests`).Scan(&totalInterests)
	h.db.QueryRow(`SELECT COUNT(*) FROM matches`).Scan(&totalMatches)
	funnel["users"] = totalUsers
	funnel["profiles"] = totalProfiles
	funnel["listings"] = totalListings
	funnel["interests"] = totalInterests
	funnel["matches"] = totalMatches
	result["funnel"] = funnel

	planRows, _ := h.db.Query(`SELECT COALESCE(plan, 'free'), COUNT(*) FROM users GROUP BY plan ORDER BY plan`)
	var planDist []map[string]interface{}
	if planRows != nil {
		defer planRows.Close()
		for planRows.Next() {
			var plan string
			var cnt int
			if planRows.Scan(&plan, &cnt) == nil {
				planDist = append(planDist, map[string]interface{}{"plan": plan, "count": cnt})
			}
		}
	}
	result["planDistribution"] = planDist

	intRows, _ := h.db.Query(`SELECT status, COUNT(*) FROM interests GROUP BY status ORDER BY status`)
	var intDist []map[string]interface{}
	if intRows != nil {
		defer intRows.Close()
		for intRows.Next() {
			var status string
			var cnt int
			if intRows.Scan(&status, &cnt) == nil {
				intDist = append(intDist, map[string]interface{}{"status": status, "count": cnt})
			}
		}
	}
	result["interestsByStatus"] = intDist

	locRows, _ := h.db.Query(`
		SELECT COALESCE(location, 'Unknown'), COUNT(*)
		FROM listings
		GROUP BY location ORDER BY COUNT(*) DESC LIMIT 10
	`)
	var topLocations []map[string]interface{}
	if locRows != nil {
		defer locRows.Close()
		for locRows.Next() {
			var loc string
			var cnt int
			if locRows.Scan(&loc, &cnt) == nil {
				topLocations = append(topLocations, map[string]interface{}{"location": loc, "count": cnt})
			}
		}
	}
	result["topLocations"] = topLocations

	var avgRating sql.NullFloat64
	h.db.QueryRow(`SELECT AVG(rating) FROM reviews`).Scan(&avgRating)
	if avgRating.Valid {
		result["avgRating"] = avgRating.Float64
	} else {
		result["avgRating"] = 0
	}

	var avgMessages sql.NullFloat64
	h.db.QueryRow(`SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM messages GROUP BY match_id) sub`).Scan(&avgMessages)
	if avgMessages.Valid {
		result["avgMessagesPerMatch"] = avgMessages.Float64
	} else {
		result["avgMessagesPerMatch"] = 0
	}

	c.JSON(http.StatusOK, result)
}
