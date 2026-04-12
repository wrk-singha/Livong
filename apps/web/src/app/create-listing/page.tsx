"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProfile } from "@/contexts/profile";

const PROPERTY_TYPES = ["room", "flat", "shared"];

export default function CreateListingPage() {
  const router = useRouter();
  const { hasProfile, loading: checkingProfile } = useProfile();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    rent: "",
    location: "",
    propertyType: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; rent: number; location: string; propertyType: string }) =>
      api.createListing(data),
    onSuccess: (res) => router.push(`/listings/${res.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create listing"),
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.rent || !form.location || !form.propertyType) {
      setError("Please fill all required fields");
      return;
    }

    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      rent: parseInt(form.rent),
      location: form.location,
      propertyType: form.propertyType,
    });
  };

  if (checkingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-border border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-dim">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">Create your profile first</p>
          <p className="text-dim text-sm mb-4">You need a profile before posting a listing</p>
          <Link
            href="/profile/setup"
            className="btn-primary inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            Create Profile
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-sm md:max-w-lg lg:max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Post a Listing</h1>
          <p className="text-dim text-sm mt-1">
            Help others find a place to live
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="input"
              placeholder="e.g. 1 Room Available in 2BHK"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Describe the place..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Rent (₹/month) *
              </label>
              <input
                type="number"
                value={form.rent}
                onChange={(e) => update("rent", e.target.value)}
                className="input"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Property Type *
              </label>
              <select
                value={form.propertyType}
                onChange={(e) => update("propertyType", e.target.value)}
                className="input bg-surface"
              >
                <option value="">Select</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Location *
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="input"
              placeholder="e.g. HSR Layout, Bangalore"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-surface px-3 py-2 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full py-3 rounded-lg text-sm font-medium"
          >
            {createMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </span>
            ) : (
              "Post Listing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
