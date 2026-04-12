"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
import { admin } from "../lib/api";

type Interest = {
  id: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  senderName: string;
  receiverName: string;
  listingTitle: string;
  status: string;
  createdAt: string;
};

export default function InterestsPage() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    admin.getInterests(page, limit).then((d) => {
      setInterests(d?.data || []);
      setTotal(d?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const filtered = interests.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(i.senderName?.toLowerCase().includes(q) || i.receiverName?.toLowerCase().includes(q) || i.listingTitle?.toLowerCase().includes(q))) return false;
    }
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "badge-warning",
      accepted: "badge-success",
      rejected: "badge-error",
    };
    return map[s] || "badge-neutral";
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Interests ({filtered.length}<span className="text-text-dim font-normal">/{total}</span>)</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search sender, receiver, listing..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface-alt border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-dim w-56"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); }}
            className="text-xs text-text-dim hover:text-text transition-colors px-2">✕ Clear</button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
        <>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Listing</th>
                <th>Status</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium text-text">{i.senderName}</td>
                  <td className="font-medium text-text">{i.receiverName}</td>
                  <td className="text-text-secondary max-w-[200px] truncate">{i.listingTitle}</td>
                  <td>
                    <span className={`badge ${statusBadge(i.status)} capitalize`}>{i.status}</span>
                  </td>
                  <td className="text-text-dim text-xs">{fmtDate(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </>
      )}
    </Shell>
  );
}
