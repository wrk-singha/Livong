"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

// Mirror of internal/flags/store.go constants. Kept hand-synced — small enough
// (6 keys, rarely added) that codegen would be overkill.
export const FLAG_KEYS = {
  MAINTENANCE: "maintenance_mode",
  CHAT: "chat_enabled",
  RENT: "rent_enabled",
  INTERESTS: "interests_enabled",
  CREATE_LISTING: "create_listing_enabled",
  PROFILE_DELETE: "profile_delete_enabled",
} as const;

type FlagMap = Record<string, boolean>;

interface FlagsContextType {
  flags: FlagMap;
  // Defaults to TRUE when a flag is missing — fail-open so new code paths
  // don't accidentally hide themselves while the flag is being added.
  isEnabled: (key: string) => boolean;
  loading: boolean;
}

const FlagsContext = createContext<FlagsContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:6980`
    : "http://localhost:6980");

// Re-poll the flags endpoint every 30s so admin toggles propagate to users
// without requiring them to refresh. Cheap (one tiny JSON request), keeps the
// "no restart needed" promise of the admin toggle UI.
const POLL_MS = 30_000;

export function FlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagMap>({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/flags`);
      if (!res.ok) return;
      const data = (await res.json()) as FlagMap;
      setFlags(data);
    } catch {
      // Swallow — keep last-known flags. If the API is down the user has
      // bigger problems than stale flag state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
    const id = setInterval(fetchFlags, POLL_MS);
    return () => clearInterval(id);
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: string) => {
      if (key in flags) return flags[key];
      return true; // fail-open
    },
    [flags]
  );

  return (
    <FlagsContext.Provider value={{ flags, isEnabled, loading }}>
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlags() {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error("useFlags must be used within FlagsProvider");
  return ctx;
}
