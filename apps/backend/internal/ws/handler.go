package ws

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/coder/websocket"
	"github.com/gin-gonic/gin"
)

// Handler exposes the two HTTP endpoints that bootstrap a WS session:
//   POST /chat/ws-ticket   — exchange JWT (via auth middleware) for a ticket
//   GET  /chat/ws?ticket=  — upgrade + accept (no auth middleware — uses ticket)
type Handler struct {
	Hub     *Hub
	Tickets *TicketStore
	db      *sql.DB
}

func NewHandler(hub *Hub, tickets *TicketStore, db *sql.DB) *Handler {
	return &Handler{Hub: hub, Tickets: tickets, db: db}
}

// IssueTicket runs behind normal JWT middleware. The user is already
// authenticated; we just mint them a single-use token they can put in the
// WebSocket URL.
func (h *Handler) IssueTicket(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "auth required"})
		return
	}
	tok, err := h.Tickets.Issue(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue ticket"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ticket": tok, "expiresIn": int(TicketTTL.Seconds())})
}

// Accept handles the WS upgrade. NO auth middleware on this route — the
// ticket IS the auth. We validate it before calling Accept so we never upgrade
// an unauthenticated request.
func (h *Handler) Accept(c *gin.Context) {
	tok := c.Query("ticket")
	if tok == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ticket required"})
		return
	}
	userID, ok := h.Tickets.Redeem(tok)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired ticket"})
		return
	}

	// In dev we accept any origin so localhost:6900 → localhost:6980 works
	// without ceremony. For prod we'd populate OriginPatterns or wrap with
	// an explicit allowlist; cookies aren't involved so CSRF risk is low.
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		// Accept already wrote a response on error.
		return
	}

	client := NewClient(conn, h.Hub, userID)

	// Authz hook: this user can only subscribe to topics they own.
	// Format: "messages:<matchId>" — they must be part of <matchId>.
	authz := func(topic string) bool {
		parts := strings.SplitN(topic, ":", 2)
		if len(parts) != 2 {
			return false
		}
		switch parts[0] {
		case "messages":
			matchID := parts[1]
			var allowed bool
			h.db.QueryRow(`
				SELECT EXISTS(SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2))
			`, matchID, userID).Scan(&allowed)
			return allowed
		}
		return false
	}

	client.Run(c.Request.Context(), authz)
}
