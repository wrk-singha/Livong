"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, imageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { useProfile, type Profile } from "@/contexts/profile";
import { Input, Select, Alert, Button } from "@/components/ui";

const PREF_OPTIONS: Record<string, string[]> = {
  smoking: ["yes", "no", "occasionally"],
  drinking: ["yes", "no", "occasionally"],
  cleanliness: ["high", "moderate", "low"],
  sleepSchedule: ["early", "late", "flexible"],
  workSchedule: ["office", "remote", "hybrid"],
  pets: ["yes", "no"],
  foodPreference: ["veg", "non-veg", "vegan", "no-preference"],
};

const LABELS: Record<string, string> = {
  smoking: "Smoking",
  drinking: "Drinking",
  cleanliness: "Cleanliness",
  sleepSchedule: "Sleep Schedule",
  workSchedule: "Work Schedule",
  pets: "Pets",
  foodPreference: "Food Preference",
};

const ICONS: Record<string, string> = {
  smoking: "🚬",
  drinking: "🍺",
  cleanliness: "✨",
  sleepSchedule: "🌙",
  workSchedule: "💼",
  pets: "🐾",
  foodPreference: "🍽️",
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function ProfilePage() {
  const { logout } = useAuth();
  const { profile, loading, setProfile, clearProfile } = useProfile();
  const [message, setMessage] = useState("");
  const pendingRef = useRef<Record<string, string>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [setupForm, setSetupForm] = useState({ name: "", age: "", gender: "", location: "" });
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (batch: Record<string, string>) => api.updateProfile(batch),
    onSuccess: () => {
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
    },
    onError: () => setMessage("Failed to save"),
  });

  const updatePref = (key: string, value: string) => {
    if (!profile) return;
    const updated = { ...profile, [key]: value };
    setProfile(updated);

    pendingRef.current = { ...pendingRef.current, [key]: value };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const batch = { ...pendingRef.current };
      pendingRef.current = {};
      saveMutation.mutate(batch);
    }, 800);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarUploading(true);
    try {
      const res = await api.uploadAvatar(file);
      setProfile({ ...profile, avatar: res.avatar });
    } catch {
      setMessage("Failed to upload photo");
      setTimeout(() => setMessage(""), 2000);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-border border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    const updateField = (key: string, value: string) =>
      setSetupForm((prev) => ({ ...prev, [key]: value }));

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setSetupError("");
      if (!setupForm.name || !setupForm.age || !setupForm.gender || !setupForm.location) {
        setSetupError("All fields are required");
        return;
      }
      setSetupLoading(true);
      try {
        await api.createProfile({
          name: setupForm.name,
          age: parseInt(setupForm.age),
          gender: setupForm.gender,
          location: setupForm.location,
        });
        const full = await api.getProfile();
        setProfile(full);
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : "Failed to create profile");
      } finally {
        setSetupLoading(false);
      }
    };

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-sm md:max-w-lg lg:max-w-xl mx-auto animate-fade-in-up">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Set up your profile</h1>
            <p className="text-dim text-sm mt-1">Help us find the best matches for you</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name"
              type="text"
              value={setupForm.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Your name"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Age"
                type="number"
                value={setupForm.age}
                onChange={(e) => updateField("age", e.target.value)}
                placeholder="25"
                min={18}
                max={60}
              />
              <Select
                label="Gender"
                options={GENDER_OPTIONS}
                value={setupForm.gender}
                onChange={(v) => updateField("gender", v)}
                placeholder="Select"
              />
            </div>
            <Input
              label="Preferred Location"
              type="text"
              value={setupForm.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. HSR Layout, Bangalore"
            />

            {setupError && <Alert>{setupError}</Alert>}

            <Button type="submit" loading={setupLoading} fullWidth size="lg">
              {setupLoading ? "Creating..." : "Save Profile"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-sm md:max-w-2xl lg:max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
          {message && (
            <span className="text-xs font-medium text-success bg-success-surface border border-success-border px-3 py-1 rounded-full animate-fade-in-up">
              {message}
            </span>
          )}
        </div>

        {/* Profile Card */}
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-14 h-14 rounded-xl shrink-0 overflow-hidden group"
              disabled={avatarUploading}
            >
              {profile.avatar ? (
                <img
                  src={imageUrl(profile.avatar)}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-white" style={{background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'}}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </button>
            <div>
              <h2 className="font-semibold text-lg text-foreground">{profile.name}</h2>
              <p className="text-sm text-dim">
                {profile.age}y · {profile.gender} · {profile.location}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-surface-alt rounded-lg px-3 py-2.5 text-center border border-border-light">
              <p className="text-[10px] text-dim uppercase font-medium tracking-wider">Location</p>
              <p className="text-sm font-semibold text-foreground">{profile.location}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">
            Lifestyle Preferences
          </h3>
          {saveMutation.isPending && (
            <div className="w-3 h-3 border-2 border-border border-t-neutral-600 rounded-full animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {Object.entries(PREF_OPTIONS).map(([key, options]) => (
            <div key={key} className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm">{ICONS[key]}</span>
                <label className="text-sm font-medium text-secondary">
                  {LABELS[key]}
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => {
                  const selected = profile[key as keyof Profile] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => updatePref(key, opt)}
                      disabled={saveMutation.isPending}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        selected
                          ? "bg-accent text-white shadow-sm"
                          : "bg-surface-alt text-muted hover:bg-surface-alt hover:text-secondary border border-border-light"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { clearProfile(); logout(); }}
          className="w-full mt-6 py-3 text-dim border border-border rounded-lg text-sm font-medium hover:bg-error-surface hover:text-red-500 hover:border-error-border transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
