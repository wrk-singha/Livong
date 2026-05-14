/**
 * useChatStream — subscribes to the messages:<matchId> topic and surfaces
 * a `connected` flag for the chat page to decide whether to keep polling.
 *
 * Pattern from TkDodo (TanStack Query maintainer): WS pushes invalidation
 * envelopes, the hook calls onInvalidate, the page refetches via REST. This
 * keeps REST as the single source of truth and avoids race conditions
 * between in-flight refetches and pushed data.
 */

"use client";

import { useEffect, useState } from "react";
import { ensureConnected, isConnected, onEvent, subscribeTopic, unsubscribeTopic } from "@/lib/ws";

export function useChatStream(matchId: string, onInvalidate: () => void) {
  const [connected, setConnected] = useState(isConnected());

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    const topic = `messages:${matchId}`;

    ensureConnected().then(() => {
      if (cancelled) return;
      subscribeTopic(topic);
      setConnected(true);
    }).catch(() => {
      // Ticket fetch / socket open failed — leave connected=false so the
      // chat page falls back to its existing polling interval.
      setConnected(false);
    });

    const off = onEvent((ev) => {
      if (
        ev.type === "invalidate" &&
        ev.entity?.[0] === "messages" &&
        ev.entity?.[1] === matchId
      ) {
        onInvalidate();
      }
    });

    // No persistent connection-state listener on partysocket itself yet —
    // we'd add one if we wanted real-time fallback resumption. For now the
    // 5s polling fallback covers gaps perfectly.

    return () => {
      cancelled = true;
      unsubscribeTopic(topic);
      off();
    };
  }, [matchId, onInvalidate]);

  return { connected };
}
