/**
 * WebSocket singleton — wraps partysocket (Cloudflare/PartyKit's reconnecting
 * WebSocket) plus our ticket-auth flow.
 *
 * Why partysocket and not raw WebSocket: handles reconnect with backoff,
 * buffers sends while disconnected, exposes connection state. Dependency-free
 * and framework-agnostic so it can be swapped without touching consumers.
 *
 * Why ticket auth and not JWT in the URL: browsers can't set custom headers
 * on a WS open, and bare JWTs in URLs leak via referrers, proxy logs, and
 * shared screenshots. Pattern: client calls POST /chat/ws-ticket with the
 * Bearer JWT, gets a 30s single-use ticket, opens wss://...?ticket=<tok>.
 * Server burns the ticket on accept.
 */

// Use ReconnectingWebSocket directly (re-exported as `WebSocket` from
// partysocket). The PartySocket class itself layers on PartyKit-specific
// host/room conventions we don't need.
import { WebSocket as ReconnectingWS } from "partysocket";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:6980`
    : "http://localhost:6980");

export type WSEvent = {
  type: "invalidate" | "pong" | "error";
  entity?: string[]; // e.g. ["messages", "<matchId>"]
  hint?: unknown;
};

type Listener = (ev: WSEvent) => void;

let socket: ReconnectingWS | null = null;
const listeners = new Set<Listener>();
let connectingPromise: Promise<void> | null = null;

function wsUrl(ticket: string) {
  // http(s) → ws(s)
  const base = API_BASE_URL.replace(/^http/, "ws");
  return `${base}/chat/ws?ticket=${encodeURIComponent(ticket)}`;
}

async function fetchTicket(): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) throw new Error("not authenticated");
  const res = await fetch(`${API_BASE_URL}/chat/ws-ticket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ticket fetch failed: ${res.status}`);
  const body = (await res.json()) as { ticket: string };
  return body.ticket;
}

/**
 * Connect (idempotent). Returns once the underlying socket has been created;
 * partysocket then handles reconnect on its own. The ticket fetcher is passed
 * to partysocket so each reconnect attempt mints a fresh ticket.
 */
export function ensureConnected(): Promise<void> {
  if (socket && socket.readyState === ReconnectingWS.OPEN) return Promise.resolve();
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      // The url-provider is called on every (re)connect attempt — perfect
      // place to mint a fresh single-use ticket each time.
      socket = new ReconnectingWS(
        async () => wsUrl(await fetchTicket()),
        undefined,
        {
          // Backoff: 0.5s → 1s → 2s → ... capped at 30s.
          minReconnectionDelay: 500,
          maxReconnectionDelay: 30000,
          reconnectionDelayGrowFactor: 2,
        }
      );
      socket.addEventListener("message", (e: MessageEvent) => {
        try {
          const ev = JSON.parse(e.data) as WSEvent;
          listeners.forEach((l) => l(ev));
        } catch {
          // Ignore malformed messages — server only sends JSON.
        }
      });
    } finally {
      connectingPromise = null;
    }
  })();
  return connectingPromise;
}

export function subscribeTopic(topic: string) {
  ensureConnected().then(() => {
    socket?.send(JSON.stringify({ type: "subscribe", topic }));
  });
}

export function unsubscribeTopic(topic: string) {
  if (!socket) return;
  socket.send(JSON.stringify({ type: "unsubscribe", topic }));
}

export function onEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Are we currently connected? Components can use this to decide whether to
 * stop polling. Returns false if partysocket is closed or reconnecting.
 */
export function isConnected(): boolean {
  return socket?.readyState === ReconnectingWS.OPEN;
}

/** Force-close. Used on logout. */
export function disconnect() {
  socket?.close();
  socket = null;
  listeners.clear();
}
