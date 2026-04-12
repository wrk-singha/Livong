"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, imageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { useProfile } from "@/contexts/profile";

type ListingImage = {
  id: string;
  url: string;
  position: number;
};

type Listing = {
  id: string;
  userId: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  propertyType: string;
  images: ListingImage[] | null;
  availableFrom?: string;
  createdAt?: string;
  ownerName?: string;
  ownerGender?: string;
};

const TYPE_LABELS: Record<string, string> = {
  room: "Private Room",
  flat: "Entire Flat",
  shared: "Shared Room",
};

const TYPE_COLORS: Record<string, string> = {
  room: "bg-info-surface text-info border-info-border",
  flat: "bg-success-surface text-success border-success-border",
  shared: "bg-warning-surface text-warning border-warning-border",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { hasProfile } = useProfile();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [currentImg, setCurrentImg] = useState(0);

  const { data: listing, isLoading: loading } = useQuery<Listing>({
    queryKey: ["listing", params.id],
    queryFn: () => api.getListing(params.id as string),
    enabled: !!params.id,
  });

  const interestMutation = useMutation({
    mutationFn: () => api.sendInterest(listing!.userId, listing!.id),
    onSuccess: () => setSent(true),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to send interest"),
  });

  const handleSendInterest = () => {
    if (!listing) return;
    if (!hasProfile) {
      router.push("/profile/setup");
      return;
    }
    setError("");
    interestMutation.mutate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-border border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-dim">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <p className="text-dim">{error || "Listing not found"}</p>
        </div>
      </div>
    );
  }

  const isOwner = listing.userId === userId;
  const hasImages = listing.images && listing.images.length > 0;
  const initials = listing.ownerName
    ? listing.ownerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-dim hover:text-secondary transition-colors mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        {/* Image Gallery */}
        <div className="rounded-xl overflow-hidden mb-4">
          {hasImages ? (
            <div className="relative w-full h-56 md:h-80 bg-surface-alt">
              <img
                src={imageUrl(listing.images![currentImg].url)}
                alt=""
                className="w-full h-full object-cover"
              />
              {listing.images!.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((p) => (p - 1 + listing.images!.length) % listing.images!.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <button
                    onClick={() => setCurrentImg((p) => (p + 1) % listing.images!.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {listing.images!.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImg(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === currentImg ? "bg-white" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 text-white text-xs">
                    {currentImg + 1} / {listing.images!.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-48 md:h-64 bg-surface-alt flex flex-col items-center justify-center text-faint">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="text-xs mt-2">No photos yet</p>
            </div>
          )}
        </div>

        {/* Title + Meta */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{listing.title}</h1>
            <span className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium border ${TYPE_COLORS[listing.propertyType] || "bg-surface-alt text-muted border-border-light"}`}>
              {TYPE_LABELS[listing.propertyType] || listing.propertyType}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-dim text-sm">
            <span className="inline-flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {listing.location}
            </span>
            {listing.createdAt && (
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {timeAgo(listing.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Price Card */}
        <div className="card p-4 mb-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-dim uppercase tracking-wider font-medium mb-0.5">Monthly Rent</p>
              <p className="text-3xl font-bold text-foreground">₹{listing.rent?.toLocaleString()}</p>
            </div>
            <p className="text-xs text-dim mb-1">per month</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Property Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-alt rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="text-[11px] font-medium">Type</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{TYPE_LABELS[listing.propertyType] || listing.propertyType}</p>
            </div>
            <div className="bg-surface-alt rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[11px] font-medium">Location</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{listing.location}</p>
            </div>
            {listing.availableFrom && (
              <div className="bg-surface-alt rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span className="text-[11px] font-medium">Available From</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {new Date(listing.availableFrom).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            <div className="bg-surface-alt rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" x2="12" y1="1" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="text-[11px] font-medium">Rent</span>
              </div>
              <p className="text-sm font-semibold text-foreground">₹{listing.rent?.toLocaleString()}/mo</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="card p-4 mb-4">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">About this place</h3>
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Owner Info */}
        {listing.ownerName && (
          <div className="card p-4 mb-4">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Listed by</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{listing.ownerName}</p>
                {listing.ownerGender && (
                  <p className="text-xs text-dim capitalize">{listing.ownerGender}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-error text-sm bg-error-surface px-3 py-2 rounded-lg mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
            {error}
          </div>
        )}

        {/* CTA */}
        {!isOwner && (
          <button
            onClick={handleSendInterest}
            disabled={interestMutation.isPending || sent}
            className={`w-full py-3.5 rounded-xl font-medium text-sm transition-colors ${
              sent
                ? "bg-success-surface text-success border border-success-border"
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
            ) : interestMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                Send Interest
              </span>
            )}
          </button>
        )}

        {isOwner && (
          <div className="text-center py-3">
            <span className="text-xs text-dim bg-surface-alt px-4 py-2 rounded-full border border-border-light">
              This is your listing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
