package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const (
	// Server pings clients to detect dead conns. Browsers won't surface a TCP
	// half-open until they try to write, so we proactively probe.
	pingInterval = 25 * time.Second
	// Max time a write can block before we consider the client unhealthy.
	writeTimeout = 10 * time.Second
)

// Client wraps a single browser's WebSocket connection. Owned by a hub.
type Client struct {
	conn   *websocket.Conn
	send   chan Event
	hub    *Hub
	userID string                 // populated from the ticket
	topics map[string]struct{}    // what this client is subscribed to
}

func NewClient(conn *websocket.Conn, hub *Hub, userID string) *Client {
	return &Client{
		conn:   conn,
		send:   make(chan Event, 16), // small buffer; drop on full per Hub.Broadcast
		hub:    hub,
		userID: userID,
		topics: make(map[string]struct{}),
	}
}

// UserID exposes who this connection authenticated as. Handler uses this to
// authz subscribe requests (e.g. only allow subscribe to a match the user is in).
func (c *Client) UserID() string { return c.userID }

// Run blocks until the connection closes. Spawns a writer goroutine and uses
// the calling goroutine as the reader.
func (c *Client) Run(ctx context.Context, onSubscribe func(topic string) bool) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	defer c.hub.UnsubscribeAll(c)
	defer c.conn.Close(websocket.StatusNormalClosure, "")

	go c.writer(ctx)

	for {
		var msg struct {
			Type  string `json:"type"`
			Topic string `json:"topic"`
		}
		if err := wsjson.Read(ctx, c.conn, &msg); err != nil {
			return // client disconnected or context cancelled
		}
		switch msg.Type {
		case "subscribe":
			if msg.Topic == "" {
				continue
			}
			if onSubscribe != nil && !onSubscribe(msg.Topic) {
				// Send an error event so the client knows the subscribe was rejected.
				c.send <- Event{Type: "error", Entity: []string{"subscribe-denied", msg.Topic}}
				continue
			}
			c.hub.Subscribe(msg.Topic, c)
		case "unsubscribe":
			c.hub.Unsubscribe(msg.Topic, c)
		case "ping":
			c.send <- Event{Type: "pong"}
		}
	}
}

func (c *Client) writer(ctx context.Context) {
	ping := time.NewTicker(pingInterval)
	defer ping.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case ev := <-c.send:
			payload, err := json.Marshal(ev)
			if err != nil {
				log.Printf("ws: marshal event: %v", err)
				continue
			}
			wctx, cancel := context.WithTimeout(ctx, writeTimeout)
			err = c.conn.Write(wctx, websocket.MessageText, payload)
			cancel()
			if err != nil {
				return // dead conn — read loop will also see this and exit
			}
		case <-ping.C:
			pctx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Ping(pctx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}
