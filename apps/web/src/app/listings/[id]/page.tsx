"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

type Listing = {
  id: string;
  userId: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  propertyType: string;
};

const TYPE_COLORS: Record<string, string> = {
  room: "bg-blue-50 text-blue-600 border-blue-100",
  flat: "bg-emerald-50 text-emerald-600 border-emerald-100",
  shared: "bg-amber-50 text-amber-600 border-amber-100",
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    api
      .getListing(params.id as string)
      .then(setListing)
      .catch(() => setError("Listing not found"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSendInterest = async () => {
    if (!listing) return;
    setSending(true);
    setError("");
    try {
      await api.sendInterest(listing.userId, listing.id);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send interest");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <p className="text-slate-400">{error || "Listing not found"}</p>
        </div>
      </div>
    );
  }

  const isOwner = listing.userId === userId;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto animate-fade-in-up">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <div className="card p-5 lg:p-8 relative overflow-hidden">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{listing.title}</h1>
              <div className="flex items-center gap-1 mt-1.5 text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-sm">{listing.location}</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${TYPE_COLORS[listing.propertyType] || "bg-slate-50 text-slate-500 border-slate-100"}`}>
              {listing.propertyType}
            </span>
          </div>

          {/* Price */}
          <div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-0.5">
              Monthly Rent
            </p>
            <p className="text-3xl font-bold gradient-text">
              ₹{listing.rent?.toLocaleString()}
            </p>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
              {error}
            </div>
          )}

          {!isOwner && (
            <button
              onClick={handleSendInterest}
              disabled={sending || sent}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                sent
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "btn-primary"
              }`}
            >
              {sent ? (
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Interest Sent
                </span>
              ) : sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Interest"
              )}
            </button>
          )}

          {isOwner && (
            <div className="text-center py-2">
              <span className="text-xs text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full">
                This is your listing
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
