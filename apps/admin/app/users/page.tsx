"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
import { admin } from "../lib/api";

type User = {
  id: string;
  phone: string;
  plan: string;
  verified: boolean;
  createdAt?: string;
  name?: string;
  age?: number;
  gender?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  smoking?: string;
  drinking?: string;
  cleanliness?: string;
  sleepSchedule?: string;
  workSchedule?: string;
  pets?: string;
  foodPref?: string;
  listingCount: number;
  interestCount: number;
  matchCount: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    admin.getUsers().then((d) => setUsers(d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleVerify = async (u: User) => {
    await admin.updateUser(u.id, { verified: !u.verified });
    load();
  };

  const changePlan = async (u: User, plan: string) => {
    await admin.updateUser(u.id, { plan });
    load();
  };

  const deleteUser = async (u: User) => {
    if (!confirm(`Delete user ${u.name || u.phone}? This removes ALL their data.`)) return;
    await admin.deleteUser(u.id);
    load();
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Users ({users.length})</h2>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Location</th>
                <th>Plan</th>
                <th>Verified</th>
                <th>Listings</th>
                <th>Matches</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <>
                  <tr key={u.id} className="cursor-pointer" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                    <td className="font-medium text-text">{u.name || <span className="text-text-dim">—</span>}</td>
                    <td className="text-text-secondary">{u.phone}</td>
                    <td className="capitalize text-text-muted">{u.gender || "—"}</td>
                    <td className="text-text-muted">{u.age || "—"}</td>
                    <td className="text-text-muted">{u.location || "—"}</td>
                    <td>
                      <select
                        value={u.plan}
                        onChange={(e) => { e.stopPropagation(); changePlan(u, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface-alt border border-border rounded px-2 py-0.5 text-xs text-text-secondary"
                      >
                        <option value="free">free</option>
                        <option value="basic">basic</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVerify(u); }}
                        className={`badge ${u.verified ? "badge-success" : "badge-neutral"}`}
                      >
                        {u.verified ? "✓ Yes" : "No"}
                      </button>
                    </td>
                    <td className="text-text-muted">{u.listingCount}</td>
                    <td className="text-text-muted">{u.matchCount}</td>
                    <td className="text-text-dim text-xs">{fmtDate(u.createdAt)}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); deleteUser(u); }} className="btn btn-danger text-[11px]">
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr key={`${u.id}-detail`}>
                      <td colSpan={11} className="bg-surface-alt/50">
                        <div className="grid grid-cols-4 gap-x-6 gap-y-2 py-2 text-xs">
                          <div><span className="text-text-dim">Budget:</span> <span className="text-text-secondary">{u.budgetMin && u.budgetMax ? `₹${u.budgetMin} – ₹${u.budgetMax}` : "—"}</span></div>
                          <div><span className="text-text-dim">Smoking:</span> <span className="text-text-secondary">{u.smoking || "—"}</span></div>
                          <div><span className="text-text-dim">Drinking:</span> <span className="text-text-secondary">{u.drinking || "—"}</span></div>
                          <div><span className="text-text-dim">Cleanliness:</span> <span className="text-text-secondary">{u.cleanliness || "—"}</span></div>
                          <div><span className="text-text-dim">Sleep:</span> <span className="text-text-secondary">{u.sleepSchedule || "—"}</span></div>
                          <div><span className="text-text-dim">Work:</span> <span className="text-text-secondary">{u.workSchedule || "—"}</span></div>
                          <div><span className="text-text-dim">Pets:</span> <span className="text-text-secondary">{u.pets || "—"}</span></div>
                          <div><span className="text-text-dim">Food:</span> <span className="text-text-secondary">{u.foodPref || "—"}</span></div>
                          <div><span className="text-text-dim">Interests sent:</span> <span className="text-text-secondary">{u.interestCount}</span></div>
                          <div><span className="text-text-dim">ID:</span> <span className="text-text-dim font-mono">{u.id.slice(0, 8)}...</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
