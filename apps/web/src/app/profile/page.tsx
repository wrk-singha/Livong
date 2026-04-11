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
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-slate-400 mb-3">No profile found</p>
          <a
            href="/profile/setup"
            className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-medium"
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
          <h1 className="text-xl font-bold text-slate-800">Profile</h1>
          {message && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-fade-in-up">
              {message}
            </span>
          )}
        </div>

        {/* Profile Card */}
        <div className="card p-5 mb-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-r from-indigo-500 to-purple-500" />
          <div className="relative pt-6 flex items-end gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl font-bold gradient-text border-2 border-white">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1">
              <h2 className="font-bold text-lg text-slate-800">{profile.name}</h2>
              <p className="text-xs text-slate-400">
                {profile.age}y · {profile.gender} · {profile.location}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-indigo-50 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">Budget</p>
              <p className="text-sm font-semibold text-indigo-600">
                ₹{profile.budgetMin?.toLocaleString()} – ₹{profile.budgetMax?.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 bg-purple-50 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">Location</p>
              <p className="text-sm font-semibold text-purple-600">{profile.location}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Lifestyle Preferences
          </h3>
          {saving && (
            <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 stagger">
          {Object.entries(PREF_OPTIONS).map(([key, options]) => (
            <div key={key} className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm">{ICONS[key]}</span>
                <label className="text-sm font-medium text-slate-700">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selected
                          ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-sm"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
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
          className="w-full mt-6 py-3 text-red-400 border border-red-100 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-500 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
