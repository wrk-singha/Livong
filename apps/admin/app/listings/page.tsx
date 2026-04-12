"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
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

  const load = () => {
    admin.getListings().then((d) => setListings(d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const deleteListing = async (l: Listing) => {
    if (!confirm(`Delete listing "${l.title}"?`)) return;
    await admin.deleteListing(l.id);
    load();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Listings ({listings.length})</h2>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
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
              {listings.map((l) => (
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
      )}
    </Shell>
  );
}
