"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, imageUrl } from "@/lib/api";

type Listing = {
  id: string;
  userId: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  propertyType: string;
  thumbnail?: string;
};

const TYPE_COLORS: Record<string, string> = {
  room: "bg-info-surface text-info",
  flat: "bg-success-surface text-success",
  shared: "bg-warning-surface text-warning",
};

export default function ExplorePage() {
  const [filters, setFilters] = useState({
    location: "",
    minBudget: "",
    maxBudget: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);

  const { data: listings = [], isLoading: loading } = useQuery<Listing[]>({
    queryKey: ["listings", appliedFilters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (appliedFilters.location) params.location = appliedFilters.location;
      if (appliedFilters.minBudget) params.minBudget = appliedFilters.minBudget;
      if (appliedFilters.maxBudget) params.maxBudget = appliedFilters.maxBudget;
      return (await api.getListings(params)) || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Explore</h1>
            <p className="text-xs text-dim mt-0.5">
              {listings.length} listing{listings.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              showFilters
                ? "bg-accent text-white shadow-sm"
                : "bg-surface text-muted border border-border hover:border-accent/30 hover:text-accent"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" />
              <line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" />
              <line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" />
              <line x1="1" x2="7" y1="14" y2="14" /><line x1="9" x2="15" y1="8" y2="8" />
              <line x1="17" x2="23" y1="16" y2="16" />
            </svg>
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <form
            onSubmit={handleSearch}
            className="card p-4 mb-4 space-y-3 md:flex md:items-end md:gap-3 md:space-y-0"
          >
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                placeholder="Search by location..."
                className="input pl-9!"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={filters.minBudget}
                onChange={(e) =>
                  setFilters({ ...filters, minBudget: e.target.value })
                }
                placeholder="Min ₹"
                className="input"
              />
              <input
                type="number"
                value={filters.maxBudget}
                onChange={(e) =>
                  setFilters({ ...filters, maxBudget: e.target.value })
                }
                placeholder="Max ₹"
                className="input"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-2.5 rounded-lg text-sm font-medium"
            >
              Search
            </button>
          </form>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-md animate-shimmer" />
                    <div className="h-3 w-1/2 rounded-md animate-shimmer" />
                  </div>
                  <div className="space-y-1 ml-4">
                    <div className="h-5 w-16 rounded-md animate-shimmer" />
                    <div className="h-2 w-10 rounded-md animate-shimmer ml-auto" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-5 w-14 rounded-md animate-shimmer" />
                  <div className="h-4 w-4 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-dim">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-dim mb-1">No listings found</p>
            <Link
              href="/create-listing"
              className="text-foreground font-medium text-sm hover:underline transition-colors"
            >
              Post the first listing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="card block group h-full overflow-hidden"
              >
                {listing.thumbnail ? (
                  <div className="w-full h-36 bg-surface-alt">
                    <img
                      src={imageUrl(listing.thumbnail)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 bg-surface-alt flex items-center justify-center text-faint">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-secondary transition-colors truncate">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-dim">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-xs">{listing.location}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        ₹{listing.rent?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-dim">/month</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-medium ${TYPE_COLORS[listing.propertyType] || "bg-surface-alt text-muted"}`}>
                      {listing.propertyType}
                    </span>
                    <svg className="text-faint group-hover:text-muted transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
