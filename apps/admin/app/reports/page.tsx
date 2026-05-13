"use client";

import React, { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
import { admin } from "../lib/api";

type Report = {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: "listing" | "profile" | "message";
  targetId: string;
  targetName: string;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  createdAt?: string;
  reviewedAt?: string;
};

const STATUSES = ["pending", "actioned", "dismissed", "reviewed", "all"] as const;
type StatusFilter = (typeof STATUSES)[number];

const REASON_LABELS: Record<string, string> = {
  harassment: "Harassment",
  scam: "Scam",
  fake_profile: "Fake profile",
  inappropriate: "Inappropriate",
  spam: "Spam",
  other: "Other",
};

const TARGET_LABELS: Record<string, string> = {
  listing: "Listing",
  profile: "Profile",
  message: "Message",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await admin.getReports(status, page, 50);
      setReports(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (id: string, action: "actioned" | "dismissed") => {
    setBusyId(id);
    setError("");
    try {
      await admin.updateReport(id, action);
      // Optimistically remove from current view if we're filtering pending
      if (status === "pending") {
        setReports((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        fetchReports();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update report");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell>
      <h2 className="text-lg font-semibold mb-4">Reports</h2>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                status === s
                  ? "bg-text-accent text-white"
                  : "bg-bg-soft text-text-dim hover:text-text-primary"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-dim ml-auto">
          {total} {status === "all" ? "" : status} report{total !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-dim text-sm py-12">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl">
          <p className="text-sm text-text-dim">No {status === "all" ? "" : status} reports.</p>
          {status === "pending" && (
            <p className="text-xs text-text-dim mt-1">Quiet day. Or no one's hit Report yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-4 bg-bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-text-accent/15 text-text-accent">
                      {TARGET_LABELS[r.targetType] || r.targetType}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-soft text-text-dim">
                      {REASON_LABELS[r.reason] || r.reason}
                    </span>
                    {r.status !== "pending" && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        r.status === "actioned"
                          ? "bg-red-900/30 text-red-400"
                          : r.status === "dismissed"
                          ? "bg-bg-soft text-text-dim"
                          : "bg-blue-900/30 text-blue-400"
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-primary font-medium truncate">
                    {r.targetName || `${r.targetType} ${r.targetId.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-text-dim mt-0.5">
                    Reported by <span className="text-text-secondary">{r.reporterName}</span>
                    {r.createdAt && (
                      <span className="text-text-dim"> · {new Date(r.createdAt).toLocaleString()}</span>
                    )}
                  </p>
                  {r.details && (
                    <p className="text-xs text-text-secondary mt-2 bg-bg-soft px-3 py-2 rounded-lg whitespace-pre-wrap">
                      {r.details}
                    </p>
                  )}
                </div>

                {r.status === "pending" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleResolve(r.id, "actioned")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      Action
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, "dismissed")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 text-xs font-medium border border-border text-text-dim rounded-lg hover:bg-bg-soft disabled:opacity-40 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={50} onPageChange={setPage} />
    </Shell>
  );
}
