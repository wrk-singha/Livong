"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { useProfile } from "@/contexts/profile";
import { Input, TextArea, Select, Alert, Button, PageSpinner, EmptyState } from "@/components/ui";

const PROPERTY_TYPE_OPTIONS = [
  { value: "room", label: "Room" },
  { value: "flat", label: "Flat" },
  { value: "shared", label: "Shared" },
  { value: "pg", label: "PG" },
];
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
  const [pgForm, setPgForm] = useState({
    meals: "none",
    sharingType: "single",
    ac: false,
    wifi: false,
    laundry: false,
    attachedBathroom: false,
    curfew: "",
    genderPreference: "any",
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; rent: number; location: string; propertyType: string }) => {
      const res = await api.createListing(data);
      if (images.length > 0) {
        await api.uploadListingImages(res.id, images);
      }
      if (data.propertyType === "pg") {
        await api.savePgDetails(res.id, {
          ...pgForm,
          curfew: pgForm.curfew || undefined,
        });
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
    return <PageSpinner />;
  }

  if (!hasProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          title="Create your profile first"
          subtitle="You need a profile before posting a listing"
          action={
            <Link
              href="/profile/setup"
              className="btn-primary inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium"
            >
              Create Profile
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-28 md:pb-6">
      <PageTitle title="Post a listing" />
      <div className="max-w-sm md:max-w-lg lg:max-w-xl mx-auto animate-fade-in-up">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Post a Listing</h1>
          <p className="text-dim text-sm mt-1">Help others find a place to live</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Property Type — pill selector */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Property Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {PROPERTY_TYPE_OPTIONS.map((opt) => {
                const selected = form.propertyType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("propertyType", opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-muted hover:border-border-light hover:text-secondary"
                    }`}
                  >
                    {opt.value === "room" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V11h6v10" />
                      </svg>
                    )}
                    {opt.value === "flat" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
                      </svg>
                    )}
                    {opt.value === "shared" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    )}
                    {opt.value === "pg" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 20v-8l10-6 10 6v8" /><path d="M6 20v-4h4v4" /><path d="M14 20v-4h4v4" /><path d="M10 12h4" />
                      </svg>
                    )}
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details card */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z" />
                </svg>
                Details
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="Title *"
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. 1 Room Available in 2BHK"
              />
              <TextArea
                label="Description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="Describe the place — amenities, rules, nearby landmarks..."
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Rent (₹/month) *"
                  type="number"
                  value={form.rent}
                  onChange={(e) => update("rent", e.target.value)}
                  placeholder="15000"
                />
                <Input
                  label="Location *"
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g. HSR Layout"
                />
              </div>
            </div>
          </div>

          {/* PG Details card — conditional */}
          {form.propertyType === "pg" && (
            <div className="card p-0 overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <path d="M2 20v-8l10-6 10 6v8" /><path d="M6 20v-4h4v4" /><path d="M14 20v-4h4v4" />
                  </svg>
                  PG Amenities
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Meals"
                    value={pgForm.meals}
                    onChange={(v) => setPgForm((p) => ({ ...p, meals: v }))}
                    options={[
                      { value: "none", label: "No Meals" },
                      { value: "veg", label: "Veg Only" },
                      { value: "both", label: "Veg & Non-Veg" },
                    ]}
                  />
                  <Select
                    label="Sharing"
                    value={pgForm.sharingType}
                    onChange={(v) => setPgForm((p) => ({ ...p, sharingType: v }))}
                    options={[
                      { value: "single", label: "Single" },
                      { value: "double", label: "Double" },
                      { value: "triple", label: "Triple" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Gender Preference"
                    value={pgForm.genderPreference}
                    onChange={(v) => setPgForm((p) => ({ ...p, genderPreference: v }))}
                    options={[
                      { value: "any", label: "Any" },
                      { value: "male", label: "Male Only" },
                      { value: "female", label: "Female Only" },
                    ]}
                  />
                  <Input
                    label="Curfew"
                    type="text"
                    value={pgForm.curfew}
                    onChange={(e) => setPgForm((p) => ({ ...p, curfew: e.target.value }))}
                    placeholder="e.g. 10 PM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Facilities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "ac", label: "AC" },
                      { key: "wifi", label: "WiFi" },
                      { key: "laundry", label: "Laundry" },
                      { key: "attachedBathroom", label: "Attached Bathroom" },
                    ] as const).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPgForm((p) => ({ ...p, [item.key]: !p[item.key] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-xs font-medium ${
                          pgForm[item.key]
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-surface text-muted"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          pgForm[item.key] ? "border-accent bg-accent" : "border-border"
                        }`}>
                          {pgForm[item.key] && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photos card */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                Photos
                <span className="text-xs text-dim font-normal ml-auto">{images.length}/{MAX_IMAGES}</span>
              </h3>
            </div>
            <div className="p-4">
              {previews.length === 0 && images.length < MAX_IMAGES ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-accent/40 flex flex-col items-center justify-center gap-2 text-dim hover:text-muted transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" /><path d="M16 5h6" /><path d="M19 2v6" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                  <span className="text-xs">Tap to add photos</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m18 6-12 12M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-accent/40 flex flex-col items-center justify-center text-dim hover:text-muted transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="text-[10px] mt-0.5">Add</span>
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImagePick}
                className="hidden"
              />
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          {/* Desktop submit */}
          <div className="hidden md:block">
            <Button type="submit" loading={createMutation.isPending} fullWidth size="lg">
              {createMutation.isPending ? "Posting..." : "Post Listing"}
            </Button>
          </div>
        </form>
      </div>

      {/* Mobile sticky bottom submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border md:hidden z-40">
        <Button type="button" onClick={handleSubmit} loading={createMutation.isPending} fullWidth size="lg">
          {createMutation.isPending ? "Posting..." : "Post Listing"}
        </Button>
      </div>
    </div>
  );
}
