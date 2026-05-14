package flags

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	Store *Store
}

func NewHandler(s *Store) *Handler {
	return &Handler{Store: s}
}

// GetFlags is the PUBLIC endpoint the web frontend hits on app boot. Returns
// only key+enabled; the description is admin-facing and not interesting to
// the frontend. No auth needed — knowing maintenance_mode is on doesn't leak
// anything you can't infer from the rest of the API also returning 503.
func (h *Handler) GetFlags(c *gin.Context) {
	all := h.Store.All()
	out := make(map[string]bool, len(all))
	for _, f := range all {
		out[f.Key] = f.Enabled
	}
	c.JSON(http.StatusOK, out)
}

// Guard returns a Gin middleware that 503s when the named flag is OFF.
// Use to gate a route or group: protected.POST("/messages", flags.Guard(s, ChatEnabled), chat.SendMessage)
func Guard(s *Store, key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.Enabled(key) {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error":   "feature temporarily unavailable",
				"flag":    key,
				"message": "We've disabled this feature briefly. Please try again soon.",
			})
			return
		}
		c.Next()
	}
}

// MaintenanceMiddleware blocks every request with 503 when maintenance_mode is ON,
// EXCEPT routes in the exempt set (auth, the flags endpoint itself, healthcheck).
// Without the exempts, admins couldn't toggle the flag back off.
func MaintenanceMiddleware(s *Store, exempt map[string]bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if exempt[c.FullPath()] {
			c.Next()
			return
		}
		if s.Enabled(MaintenanceMode) {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error":           "maintenance",
				"maintenanceMode": true,
				"message":         "Livong is briefly down for maintenance. Back in a few minutes.",
			})
			return
		}
		c.Next()
	}
}
