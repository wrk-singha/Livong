package middleware

import (
	"database/sql"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/rohit/livong-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthWithDB validates the JWT and rejects tokens whose user has been deleted
// (DPDP soft-delete). Use this in main.go where a *sql.DB is available.
func AuthWithDB(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// Reject tokens for deleted accounts — token might still be in the user's
		// localStorage after they delete on another device.
		var deleted sql.NullTime
		if err := db.QueryRow(`SELECT deleted_at FROM users WHERE id = $1`, claims.UserID).Scan(&deleted); err == sql.ErrNoRows || (err == nil && deleted.Valid) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "account no longer exists"})
			return
		}

		c.Set("userId", claims.UserID)
		c.Next()
	}
}

// Auth is the legacy entry point — kept so existing tests pass. Skips the deleted-user check.
// Prefer AuthWithDB in production routes.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("userId", claims.UserID)
		c.Next()
	}
}

func CORS() gin.HandlerFunc {
	privateOrigin := regexp.MustCompile(`^http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$`)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := os.Getenv("CORS_ORIGINS")
		if allowed == "" {
			allowed = "http://localhost:6900"
		}

		matched := false
		for _, o := range strings.Split(allowed, ",") {
			if strings.TrimSpace(o) == origin {
				matched = true
				break
			}
		}

		if !matched && allowed == "http://localhost:6900" && privateOrigin.MatchString(origin) {
			matched = true
		}

		if matched {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Writer.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Writer.Header().Set("X-DNS-Prefetch-Control", "off")
		c.Writer.Header().Set("X-Download-Options", "noopen")
		c.Writer.Header().Set("X-XSS-Protection", "0")
		c.Writer.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
