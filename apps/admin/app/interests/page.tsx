"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
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

  useEffect(() => {
    admin.getInterests().then((d) => setInterests(d || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
        <h2 className="text-lg font-bold">Interests ({interests.length})</h2>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
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
              {interests.map((i) => (
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
      )}
    </Shell>
  );
}
