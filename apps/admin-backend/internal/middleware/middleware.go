package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/rohit/livong-admin-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

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
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := os.Getenv("CORS_ORIGINS")
		if allowed == "" {
			allowed = "http://localhost:3100"
		}

		allowedOrigins := strings.Split(allowed, ",")
		originAllowed := false
		for _, o := range allowedOrigins {
			if strings.TrimSpace(o) == origin {
				originAllowed = true
				break
			}
		}

		if originAllowed {
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

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
