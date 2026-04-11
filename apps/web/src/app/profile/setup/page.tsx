"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const GENDER_OPTIONS = ["male", "female", "other"];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    budgetMin: "",
    budgetMax: "",
    location: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.age || !form.gender || !form.budgetMin || !form.budgetMax || !form.location) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.createProfile({
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        budgetMin: parseInt(form.budgetMin),
        budgetMax: parseInt(form.budgetMax),
        location: form.location,
      });
      router.push("/explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-sm md:max-w-lg lg:max-w-xl mx-auto animate-fade-in-up">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 flex-1 bg-neutral-900 rounded-full" />
          <div className="h-1 flex-1 bg-neutral-200 rounded-full" />
          <div className="h-1 flex-1 bg-neutral-200 rounded-full" />
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-neutral-900">Set up your profile</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Help us find the best matches for you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Age
              </label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
                className="input"
                placeholder="25"
                min={18}
                max={60}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                className="input bg-white"
              >
                <option value="">Select</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Preferred Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="input"
              placeholder="e.g. HSR Layout, Bangalore"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Budget Range (₹/month)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.budgetMin}
                onChange={(e) => update("budgetMin", e.target.value)}
                className="input"
                placeholder="Min ₹8,000"
              />
              <input
                type="number"
                value={form.budgetMax}
                onChange={(e) => update("budgetMax", e.target.value)}
                className="input"
                placeholder="Max ₹15,000"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-lg text-sm font-medium"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
