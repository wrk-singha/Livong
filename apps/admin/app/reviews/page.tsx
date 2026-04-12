"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import Pagination from "../components/Pagination";
import { admin } from "../lib/api";

type Review = {
  id: string;
  listingId: string;
  reviewerId: string;
  reviewerName: string;
  listingTitle: string;
  ownerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    admin.getReviews(page, limit).then((d) => {
      setReviews(d?.data || []);
      setTotal(d?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const filtered = reviews.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.reviewerName?.toLowerCase().includes(q) || r.listingTitle?.toLowerCase().includes(q) || r.ownerName?.toLowerCase().includes(q))) return false;
    }
    if (ratingFilter && r.rating !== Number(ratingFilter)) return false;
    return true;
  });

  const deleteReview = async (r: Review) => {
    if (!confirm(`Delete review by ${r.reviewerName}?`)) return;
    await admin.deleteReview(r.id);
    load();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Reviews ({filtered.length}<span className="text-text-dim font-normal">/{total}</span>)</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search reviewer, listing, owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface-alt border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-dim w-56"
        />
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}
          className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-secondary">
          <option value="">All Ratings</option>
          <option value="5">5 ★</option>
          <option value="4">4 ★</option>
          <option value="3">3 ★</option>
          <option value="2">2 ★</option>
          <option value="1">1 ★</option>
        </select>
        {(search || ratingFilter) && (
          <button onClick={() => { setSearch(""); setRatingFilter(""); }}
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
                <th>Reviewer</th>
                <th>Listing</th>
                <th>Owner</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-text">{r.reviewerName}</td>
                  <td className="text-text-secondary max-w-[180px] truncate">{r.listingTitle}</td>
                  <td className="text-text-muted">{r.ownerName}</td>
                  <td className="text-amber-400 text-xs tracking-tight">{stars(r.rating)}</td>
                  <td className="text-text-secondary max-w-[250px] truncate">{r.comment || <span className="text-text-dim italic">No comment</span>}</td>
                  <td className="text-text-dim text-xs">{fmtDate(r.createdAt)}</td>
                  <td>
                    <button onClick={() => deleteReview(r)} className="btn btn-danger text-[11px]">Delete</button>
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
