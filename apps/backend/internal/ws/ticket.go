package ws

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// TicketTTL is short on purpose — clients call /chat/ws-ticket and immediately
// open the WS, so 30s is enough to absorb network jitter without leaving
// long-lived single-use tokens lying around in URLs / proxy logs.
const TicketTTL = 30 * time.Second

type ticketEntry struct {
	userID    string
	expiresAt time.Time
}

// TicketStore issues single-use tickets that exchange the user's bearer JWT
// (validated by normal HTTP middleware) for a short-lived URL-safe token the
// browser can put in `wss://...?ticket=`. Browsers can't set custom headers
// on a WebSocket open, so this is the modern alternative to embedding the JWT
// in the URL (which leaks via referrers, proxy logs, and chat-app pasting).
//
// In-memory is fine while we run a single VM. When we add VM #2, swap this
// for a Postgres `ws_tickets(token PK, user_id, expires_at)` table — same
// interface, two-line change in the handler.
type TicketStore struct {
	mu      sync.Mutex
	tickets map[string]ticketEntry
}

func NewTicketStore() *TicketStore {
	s := &TicketStore{tickets: make(map[string]ticketEntry)}
	// Periodic sweep so a flood of unredeemed tickets can't grow the map
	// unbounded. 1m cadence is fine — TTL is 30s.
	go func() {
		t := time.NewTicker(1 * time.Minute)
		for range t.C {
			s.gc()
		}
	}()
	return s
}

// Issue mints a ticket for userID and returns the opaque token.
func (s *TicketStore) Issue(userID string) (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	tok := hex.EncodeToString(b[:])
	s.mu.Lock()
	s.tickets[tok] = ticketEntry{userID: userID, expiresAt: time.Now().Add(TicketTTL)}
	s.mu.Unlock()
	return tok, nil
}

// Redeem returns (userID, true) if the ticket is valid AND deletes it (single
// use). Otherwise ("", false).
func (s *TicketStore) Redeem(tok string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.tickets[tok]
	if !ok || time.Now().After(e.expiresAt) {
		delete(s.tickets, tok) // clean up expired
		return "", false
	}
	delete(s.tickets, tok)
	return e.userID, true
}

func (s *TicketStore) gc() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for tok, e := range s.tickets {
		if now.After(e.expiresAt) {
			delete(s.tickets, tok)
		}
	}
}
