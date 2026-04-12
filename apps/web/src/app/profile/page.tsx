"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

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

type Profile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
  smoking?: string;
  drinking?: string;
  cleanliness?: string;
  sleepSchedule?: string;
  workSchedule?: string;
  pets?: string;
  foodPreference?: string;
};

export default function ProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = async (key: string, value: string) => {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      await api.updateProfile({ [key]: value });
      setProfile({ ...profile, [key]: value });
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-dim">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-dim mb-3">No profile found</p>
          <a
            href="/profile/setup"
            className="btn-primary inline-block px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            Create profile
          </a>
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
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold text-white shrink-0" style={{background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'}}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">{profile.name}</h2>
              <p className="text-sm text-dim">
                {profile.age}y · {profile.gender} · {profile.location}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-surface-alt rounded-lg px-3 py-2.5 text-center border border-border-light">
              <p className="text-[10px] text-dim uppercase font-medium tracking-wider">Budget</p>
              <p className="text-sm font-semibold text-foreground">
                ₹{profile.budgetMin?.toLocaleString()} – ₹{profile.budgetMax?.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 bg-surface-alt rounded-lg px-3 py-2.5 text-center border border-border-light">
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
          {saving && (
            <div className="w-3 h-3 border-2 border-border border-t-neutral-600 rounded-full animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 stagger">
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
                      disabled={saving}
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
          onClick={logout}
          className="w-full mt-6 py-3 text-dim border border-border rounded-lg text-sm font-medium hover:bg-error-surface hover:text-red-500 hover:border-error-border transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
