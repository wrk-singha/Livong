"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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
  room: "bg-info-surface text-info",
  flat: "bg-success-surface text-success",
  shared: "bg-warning-surface text-warning",
};

export default function ExplorePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: "",
    minBudget: "",
    maxBudget: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.location) params.location = filters.location;
      if (filters.minBudget) params.minBudget = filters.minBudget;
      if (filters.maxBudget) params.maxBudget = filters.maxBudget;
      const data = await api.getListings(params);
      setListings(data || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
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
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showFilters
                ? "bg-neutral-900 text-white"
                : "bg-surface text-muted border border-border hover:border-muted"
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
            className="card p-4 mb-4 space-y-3 animate-fade-in-up md:flex md:items-end md:gap-3 md:space-y-0"
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
          <div className="flex flex-col items-center py-16">
            <div className="w-8 h-8 border-3 border-border border-t-secondary rounded-full animate-spin" />
            <p className="text-sm text-dim mt-3">Loading listings...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="card block p-4 group h-full"
              >
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
                    {listing.description && (
                      <p className="text-xs text-dim mt-1.5 line-clamp-2">
                        {listing.description}
                      </p>
                    )}
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
