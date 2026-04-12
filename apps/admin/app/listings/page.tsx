"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
import { admin } from "../lib/api";

type Listing = {
  id: string;
  userId: string;
  ownerName: string;
  title: string;
  rent: number;
  location: string;
  roomType: string;
  furnishing: string;
  availableFrom: string;
  createdAt: string;
  imageCount: number;
  interestCount: number;
  reviewCount: number;
  avgRating: number;
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [furnishFilter, setFurnishFilter] = useState("");
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    admin.getListings(page, limit).then((d) => {
      setListings(d?.data || []);
      setTotal(d?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const filtered = listings.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(l.title?.toLowerCase().includes(q) || l.ownerName?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q))) return false;
    }
    if (typeFilter && (l.roomType || "") !== typeFilter) return false;
    if (furnishFilter && (l.furnishing || "") !== furnishFilter) return false;
    return true;
  });

  const deleteListing = async (l: Listing) => {
    if (!confirm(`Delete listing "${l.title}"?`)) return;
    await admin.deleteListing(l.id);
    load();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Listings ({filtered.length}<span className="text-text-dim font-normal">/{total}</span>)</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search title, owner, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface-alt border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-dim w-56"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Types</option>
          <option value="single">Single</option>
          <option value="shared">Shared</option>
          <option value="pg">PG</option>
        </select>
        <select value={furnishFilter} onChange={(e) => setFurnishFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Furnishing</option>
          <option value="furnished">Furnished</option>
          <option value="semi-furnished">Semi-furnished</option>
          <option value="unfurnished">Unfurnished</option>
        </select>
        {(search || typeFilter || furnishFilter) && (
          <button onClick={() => { setSearch(""); setTypeFilter(""); setFurnishFilter(""); }}
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
                <th>Title</th>
                <th>Owner</th>
                <th>Rent</th>
                <th>Location</th>
                <th>Type</th>
                <th>Furnishing</th>
                <th>Images</th>
                <th>Interests</th>
                <th>Reviews</th>
                <th>Rating</th>
                <th>Available</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium text-text max-w-[200px] truncate">{l.title}</td>
                  <td className="text-text-secondary">{l.ownerName}</td>
                  <td className="text-text-secondary">₹{l.rent?.toLocaleString("en-IN")}</td>
                  <td className="text-text-muted">{l.location || "—"}</td>
                  <td><span className="badge badge-info">{l.roomType || "—"}</span></td>
                  <td className="text-text-muted capitalize">{l.furnishing || "—"}</td>
                  <td className="text-text-muted">{l.imageCount}</td>
                  <td className="text-text-muted">{l.interestCount}</td>
                  <td className="text-text-muted">{l.reviewCount}</td>
                  <td className="text-text-muted">{l.avgRating ? `${l.avgRating.toFixed(1)} ★` : "—"}</td>
                  <td className="text-text-dim text-xs">{l.availableFrom ? fmtDate(l.availableFrom) : "—"}</td>
                  <td className="text-text-dim text-xs">{fmtDate(l.createdAt)}</td>
                  <td>
                    <button onClick={() => deleteListing(l)} className="btn btn-danger text-[11px]">Delete</button>
                  </td>
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
