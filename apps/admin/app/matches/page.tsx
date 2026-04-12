"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
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

  useEffect(() => {
    admin.getMatches().then((d) => setMatches(d || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Matches ({matches.length})</h2>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
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
              {matches.map((m) => (
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
      )}
    </Shell>
  );
}
