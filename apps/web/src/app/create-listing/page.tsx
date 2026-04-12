"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProfile } from "@/contexts/profile";

const PROPERTY_TYPES = ["room", "flat", "shared"];
const MAX_IMAGES = 5;

export default function CreateListingPage() {
  const router = useRouter();
  const { hasProfile, loading: checkingProfile } = useProfile();
  const [error, setError] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    rent: "",
    location: "",
    propertyType: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; rent: number; location: string; propertyType: string }) => {
      const res = await api.createListing(data);
      if (images.length > 0) {
        await api.uploadListingImages(res.id, images);
      }
      return res;
    },
    onSuccess: (res) => router.push(`/listings/${res.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create listing"),
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    setImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(f);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

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

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Photos ({images.length}/{MAX_IMAGES})
            </label>
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-foreground/70 text-background rounded-full flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="m18 6-12 12M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center text-dim hover:text-muted transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[10px] mt-0.5">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImagePick}
              className="hidden"
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
