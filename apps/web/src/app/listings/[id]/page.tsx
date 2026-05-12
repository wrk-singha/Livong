"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, imageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { useProfile } from "@/contexts/profile";
import { BackButton, PageSpinner, EmptyState, Avatar, StarRatingDisplay, Alert, VerifiedBadge } from "@/components/ui";
import Link from "next/link";

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
  ownerVerified?: boolean;
  ownerAge?: number;
  ownerLocation?: string;
  ownerSmoking?: string;
  ownerDrinking?: string;
  ownerCleanliness?: string;
  ownerSleepSchedule?: string;
  ownerFoodPref?: string;
  ownerRating?: number;
  ownerReviewCount?: number;
  pgDetails?: {
    meals: string;
    sharingType: string;
    ac: boolean;
    wifi: boolean;
    laundry: boolean;
    attachedBathroom: boolean;
    curfew?: string;
    genderPreference: string;
  };
};

const TYPE_LABELS: Record<string, string> = {
  room: "Private Room",
  flat: "Entire Flat",
  shared: "Shared Room",
  pg: "Paying Guest",
};

const TYPE_COLORS: Record<string, string> = {
  room: "bg-info-surface text-info border-info-border",
  flat: "bg-success-surface text-success border-success-border",
  shared: "bg-warning-surface text-warning border-warning-border",
  pg: "bg-accent/10 text-accent border-accent/30",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  // Clamp negatives — server clock skew or future-dated rows shouldn't render
  // as "-275m ago". Treat "future or just-now" both as "just now".
  if (diff < 60_000) return "just now";
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

  const { data: reviewData } = useQuery({
    queryKey: ["reviews", params.id],
    queryFn: () => api.getListingReviews(params.id as string),
    enabled: !!params.id,
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
    return <PageSpinner />;
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          }
          title={error || "Listing not found"}
        />
      </div>
    );
  }

  const isOwner = listing.userId === userId;
  const hasImages = listing.images && listing.images.length > 0;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        {/* Back button */}
        <BackButton />

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

        {/* PG Amenities */}
        {listing.propertyType === "pg" && listing.pgDetails && (
          <div className="card p-4 mb-4">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">PG Amenities</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-alt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M3 7h5l2-2h4l2 2h5" /><circle cx="12" cy="15" r="3" /><rect x="2" y="7" width="20" height="14" rx="2" /></svg>
                <div><p className="text-[10px] text-dim">Sharing</p><p className="text-xs font-medium text-foreground capitalize">{listing.pgDetails.sharingType}</p></div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-alt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
                <div><p className="text-[10px] text-dim">Meals</p><p className="text-xs font-medium text-foreground capitalize">{listing.pgDetails.meals === "none" ? "Not Included" : listing.pgDetails.meals === "veg" ? "Veg Only" : "Veg & Non-Veg"}</p></div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-alt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                <div><p className="text-[10px] text-dim">Gender</p><p className="text-xs font-medium text-foreground capitalize">{listing.pgDetails.genderPreference === "any" ? "Co-ed" : listing.pgDetails.genderPreference + " Only"}</p></div>
              </div>
              {listing.pgDetails.curfew && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-alt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <div><p className="text-[10px] text-dim">Curfew</p><p className="text-xs font-medium text-foreground">{listing.pgDetails.curfew}</p></div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {listing.pgDetails.ac && <span className="px-2.5 py-1 rounded-full bg-success-surface text-success text-[11px] font-medium">AC</span>}
              {listing.pgDetails.wifi && <span className="px-2.5 py-1 rounded-full bg-info-surface text-info text-[11px] font-medium">WiFi</span>}
              {listing.pgDetails.laundry && <span className="px-2.5 py-1 rounded-full bg-warning-surface text-warning text-[11px] font-medium">Laundry</span>}
              {listing.pgDetails.attachedBathroom && <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-medium">Attached Bath</span>}
            </div>
          </div>
        )}

        {/* Owner Info */}
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Listed by</h3>
          <div className="flex items-center gap-3">
            <Avatar name={listing.ownerName || "U"} size="lg" shape="circle" gradient />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground">{listing.ownerName}</p>
                {listing.ownerVerified && <VerifiedBadge size={15} />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {listing.ownerAge && (
                  <span className="text-xs text-dim">{listing.ownerAge} yrs</span>
                )}
                {listing.ownerAge && listing.ownerGender && <span className="text-faint">·</span>}
                {listing.ownerGender && (
                  <span className="text-xs text-dim capitalize">{listing.ownerGender}</span>
                )}
                {(listing.ownerAge || listing.ownerGender) && listing.ownerLocation && <span className="text-faint">·</span>}
                {listing.ownerLocation && (
                  <span className="text-xs text-dim">{listing.ownerLocation}</span>
                )}
              </div>
              {listing.ownerRating !== undefined && listing.ownerReviewCount !== undefined && listing.ownerReviewCount > 0 && (
                <div className="mt-1">
                  <StarRatingDisplay rating={listing.ownerRating} count={listing.ownerReviewCount} size={12} />
                </div>
              )}
            </div>
          </div>

          {/* Lifestyle tags */}
          {(listing.ownerSmoking || listing.ownerDrinking || listing.ownerCleanliness || listing.ownerSleepSchedule || listing.ownerFoodPref) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-light">
              {listing.ownerSmoking && (
                <span className="px-2.5 py-1 rounded-md bg-surface-alt text-[11px] text-muted">
                  🚬 {listing.ownerSmoking}
                </span>
              )}
              {listing.ownerDrinking && (
                <span className="px-2.5 py-1 rounded-md bg-surface-alt text-[11px] text-muted">
                  🍻 {listing.ownerDrinking}
                </span>
              )}
              {listing.ownerCleanliness && (
                <span className="px-2.5 py-1 rounded-md bg-surface-alt text-[11px] text-muted">
                  ✨ {listing.ownerCleanliness}
                </span>
              )}
              {listing.ownerSleepSchedule && (
                <span className="px-2.5 py-1 rounded-md bg-surface-alt text-[11px] text-muted">
                  🌙 {listing.ownerSleepSchedule}
                </span>
              )}
              {listing.ownerFoodPref && (
                <span className="px-2.5 py-1 rounded-md bg-surface-alt text-[11px] text-muted">
                  🍽️ {listing.ownerFoodPref}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        {reviewData && reviewData.reviewCount > 0 && (
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">Reviews</h3>
              <StarRatingDisplay rating={reviewData.averageRating} count={reviewData.reviewCount} />
            </div>

            <div className="relative">
              <div className="space-y-3">
                {reviewData.reviews.map((review) => (
                  <div key={review.id} className="border-t border-border-light pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center text-[11px] font-semibold text-muted">
                          {review.reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{review.reviewerName}</span>
                      </div>
                      <StarRatingDisplay rating={review.rating} size={11} />
                    </div>
                    {review.comment ? (
                      <p className="text-sm text-secondary leading-relaxed ml-9">{review.comment}</p>
                    ) : !reviewData.isPaid ? (
                      <p className="text-sm text-faint ml-9 blur-[6px] select-none pointer-events-none">
                        This review contains detailed feedback about the living experience and roommate compatibility...
                      </p>
                    ) : null}
                    <p className="text-[10px] text-faint mt-1 ml-9">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Blur overlay for free users */}
              {!reviewData.isPaid && reviewData.reviews.some((r) => !r.comment) && (
                <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-surface via-surface/90 to-transparent flex items-end justify-center pb-3">
                  <Link href="/plans" className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Subscribe to see full reviews
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <Alert className="mb-4">{error}</Alert>}

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
