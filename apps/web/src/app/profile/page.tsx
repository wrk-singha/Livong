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
        <div className="w-8 h-8 border-3 border-neutral-200 dark:border-neutral-700 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-neutral-400 mb-3">No profile found</p>
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
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Profile</h1>
          {message && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full animate-fade-in-up">
              {message}
            </span>
          )}
        </div>

        {/* Profile Card */}
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-neutral-900 rounded-xl flex items-center justify-center text-xl font-semibold text-white shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">{profile.name}</h2>
              <p className="text-sm text-neutral-400">
                {profile.age}y · {profile.gender} · {profile.location}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2.5 text-center border border-neutral-100 dark:border-neutral-700">
              <p className="text-[10px] text-neutral-400 uppercase font-medium tracking-wider">Budget</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                ₹{profile.budgetMin?.toLocaleString()} – ₹{profile.budgetMax?.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2.5 text-center border border-neutral-100 dark:border-neutral-700">
              <p className="text-[10px] text-neutral-400 uppercase font-medium tracking-wider">Location</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{profile.location}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Lifestyle Preferences
          </h3>
          {saving && (
            <div className="w-3 h-3 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 stagger">
          {Object.entries(PREF_OPTIONS).map(([key, options]) => (
            <div key={key} className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm">{ICONS[key]}</span>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selected
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-100 dark:border-neutral-700"
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
          className="w-full mt-6 py-3 text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
