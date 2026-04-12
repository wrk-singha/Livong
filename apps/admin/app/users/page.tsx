"use client";

import React, { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    admin.getUsers(page, limit).then((d) => {
      setUsers(d?.data || []);
      setTotal(d?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(u.name?.toLowerCase().includes(q) || u.phone.includes(q) || u.location?.toLowerCase().includes(q))) return false;
    }
    if (planFilter && u.plan !== planFilter) return false;
    if (verifiedFilter === "yes" && !u.verified) return false;
    if (verifiedFilter === "no" && u.verified) return false;
    if (genderFilter && (u.gender || "") !== genderFilter) return false;
    return true;
  });

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
        <h2 className="text-lg font-bold">Users ({filtered.length}<span className="text-text-dim font-normal">/{total}</span>)</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search name, phone, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface-alt border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-dim w-56"
        />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
        <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Verified</option>
          <option value="yes">Verified</option>
          <option value="no">Unverified</option>
        </select>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {(search || planFilter || verifiedFilter || genderFilter) && (
          <button onClick={() => { setSearch(""); setPlanFilter(""); setVerifiedFilter(""); setGenderFilter(""); }}
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
              {filtered.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className="cursor-pointer" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
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
                </React.Fragment>
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
