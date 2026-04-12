"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
import { admin } from "../lib/api";

type Match = {
  id: string;
  user1Id: string;
  user2Id: string;
  listingId: string;
  user1Name: string;
  user2Name: string;
  listingTitle: string;
  messageCount: number;
  createdAt: string;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [msgFilter, setMsgFilter] = useState("");
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    admin.getMatches(page, limit).then((d) => {
      setMatches(d?.data || []);
      setTotal(d?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const filtered = matches.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(m.user1Name?.toLowerCase().includes(q) || m.user2Name?.toLowerCase().includes(q) || m.listingTitle?.toLowerCase().includes(q))) return false;
    }
    if (msgFilter === "active" && m.messageCount === 0) return false;
    if (msgFilter === "silent" && m.messageCount > 0) return false;
    return true;
  });

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Matches ({filtered.length}<span className="text-text-dim font-normal">/{total}</span>)</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search users, listing..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface-alt border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-dim w-56"
        />
        <select value={msgFilter} onChange={(e) => setMsgFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Matches</option>
          <option value="active">Has Messages</option>
          <option value="silent">No Messages</option>
        </select>
        {(search || msgFilter) && (
          <button onClick={() => { setSearch(""); setMsgFilter(""); }}
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
                <th>User 1</th>
                <th>User 2</th>
                <th>Listing</th>
                <th>Messages</th>
                <th>Matched</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-text">{m.user1Name}</td>
                  <td className="font-medium text-text">{m.user2Name}</td>
                  <td className="text-text-secondary max-w-[200px] truncate">{m.listingTitle}</td>
                  <td>
                    <span className={`badge ${m.messageCount > 0 ? "badge-accent" : "badge-neutral"}`}>
                      {m.messageCount}
                    </span>
                  </td>
                  <td className="text-text-dim text-xs">{fmtDate(m.createdAt)}</td>
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
