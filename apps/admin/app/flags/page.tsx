"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
import { admin } from "../lib/api";

type Flag = {
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string;
};

// Human-readable labels per flag key. Falls back to the key if missing.
const LABELS: Record<string, string> = {
  maintenance_mode: "Maintenance Mode",
  chat_enabled: "Chat",
  rent_enabled: "Rent Tracking",
  interests_enabled: "Send Interest",
  create_listing_enabled: "Create Listing",
  profile_delete_enabled: "Account Deletion",
};

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchFlags = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await admin.getFlags();
      setFlags(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const toggle = async (f: Flag) => {
    setBusyKey(f.key);
    setError("");
    // Optimistic update — flip locally now, revert on failure.
    setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: !x.enabled } : x)));
    try {
      await admin.setFlag(f.key, !f.enabled);
    } catch (e) {
      setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: f.enabled } : x)));
      setError(e instanceof Error ? e.message : "Failed to toggle flag");
    } finally {
      setBusyKey(null);
    }
  };

  const maintenance = flags.find((f) => f.key === "maintenance_mode");

  return (
    <Shell>
      <div className="p-6 max-w-3xl">
        <div className="mb-5">
          <h1 className="text-lg font-bold text-text">Feature Flags</h1>
          <p className="text-xs text-text-muted mt-1">
            Toggle features without redeploying. Main backend picks up changes within ~5s.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs bg-error-surface border border-error-border text-error rounded">
            {error}
          </div>
        )}

        {/* Maintenance gets prominent placement — it's the nuclear button. */}
        {maintenance && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${maintenance.enabled ? "border-error bg-error-surface" : "border-border bg-surface"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-semibold text-text">⚠ Maintenance Mode</h2>
                  {maintenance.enabled && (
                    <span className="text-[10px] font-bold text-error uppercase tracking-wider px-1.5 py-0.5 bg-error/10 rounded">LIVE</span>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{maintenance.description}</p>
              </div>
              <Toggle
                enabled={maintenance.enabled}
                busy={busyKey === maintenance.key}
                onToggle={() => toggle(maintenance)}
              />
            </div>
          </div>
        )}

        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Per-feature switches
        </div>

        {loading ? (
          <div className="text-sm text-text-muted py-8 text-center">Loading…</div>
        ) : (
          <div className="space-y-1.5">
            {flags
              .filter((f) => f.key !== "maintenance_mode")
              .map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-4 p-3 bg-surface border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">
                      {LABELS[f.key] || f.key}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 truncate">
                      {f.description || f.key}
                    </div>
                  </div>
                  <Toggle
                    enabled={f.enabled}
                    busy={busyKey === f.key}
                    onToggle={() => toggle(f)}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Toggle({ enabled, busy, onToggle }: { enabled: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-pressed={enabled}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
        enabled ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
