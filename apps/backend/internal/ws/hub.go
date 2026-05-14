// Package ws is an in-process WebSocket hub for fanning real-time events out
// to subscribed clients (chat invalidation today; presence/typing later).
//
// Today's model: single VM, in-process map. When VM #2 lands, swap the
// in-handler hub.Broadcast call for `pg_notify('livong_event', json)` and add
// a single goroutine in this package doing `LISTEN livong_event` on a
// dedicated *sql.Conn that fans into Broadcast. No API surface change.
package ws

import (
	"sync"
)

// Event is what we send to clients. Keep it small — clients refetch via REST
// when they see one of these. Pushing only invalidation envelopes (not data)
// keeps REST as the single source of truth and avoids WS/REST race conditions.
// Pattern from https://tkdodo.eu/blog/using-web-sockets-with-react-query.
type Event struct {
	Type   string   `json:"type"`             // "invalidate"
	Entity []string `json:"entity"`           // e.g. ["messages", "<matchId>"]
	Hint   any      `json:"hint,omitempty"`   // optional payload for optimistic updates
}

type Hub struct {
	mu     sync.RWMutex
	topics map[string]map[*Client]struct{} // topic -> set of subscribers
}

func NewHub() *Hub {
	return &Hub{topics: make(map[string]map[*Client]struct{})}
}

// Subscribe adds c to topic. Idempotent.
func (h *Hub) Subscribe(topic string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	subs, ok := h.topics[topic]
	if !ok {
		subs = make(map[*Client]struct{})
		h.topics[topic] = subs
	}
	subs[c] = struct{}{}
	c.topics[topic] = struct{}{}
}

// Unsubscribe removes c from topic and cleans up empty topic maps.
func (h *Hub) Unsubscribe(topic string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if subs, ok := h.topics[topic]; ok {
		delete(subs, c)
		if len(subs) == 0 {
			delete(h.topics, topic)
		}
	}
	delete(c.topics, topic)
}

// UnsubscribeAll removes c from every topic. Called on disconnect.
func (h *Hub) UnsubscribeAll(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for topic := range c.topics {
		if subs, ok := h.topics[topic]; ok {
			delete(subs, c)
			if len(subs) == 0 {
				delete(h.topics, topic)
			}
		}
	}
	c.topics = nil
}

// Broadcast sends ev to every client subscribed to topic. Non-blocking per
// client: if a client's send channel is full (slow consumer), we drop the
// event for that client rather than stall the producer. Slow clients will
// reconcile via the REST refetch on their next interaction.
func (h *Hub) Broadcast(topic string, ev Event) {
	h.mu.RLock()
	subs := h.topics[topic]
	// Snapshot the recipient list under RLock so we can release the hub lock
	// before doing any channel sends — that way a slow consumer can't block
	// other goroutines from subscribing/unsubscribing.
	clients := make([]*Client, 0, len(subs))
	for c := range subs {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- ev:
		default:
			// Drop. Client will recover via next REST poll/interaction.
		}
	}
}
