"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
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

  const load = () => {
    admin.getReviews().then((d) => setReviews(d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
        <h2 className="text-lg font-bold">Reviews ({reviews.length})</h2>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
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
              {reviews.map((r) => (
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
      )}
    </Shell>
  );
}
