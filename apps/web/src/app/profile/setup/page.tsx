"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { Input, Select, Alert, Button } from "@/components/ui";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Popular roommate-search areas. Used as <datalist> suggestions to nudge
// consistent location strings (the matching logic does loose substring match,
// so typos like "korammangala" silently break recall).
const LOCATION_SUGGESTIONS = [
  "HSR Layout, Bangalore",
  "Koramangala, Bangalore",
  "Indiranagar, Bangalore",
  "Whitefield, Bangalore",
  "Marathahalli, Bangalore",
  "BTM Layout, Bangalore",
  "Electronic City, Bangalore",
  "Andheri, Mumbai",
  "Bandra, Mumbai",
  "Powai, Mumbai",
  "Thane, Mumbai",
  "Gurgaon",
  "Noida",
  "Dwarka, Delhi",
  "Gachibowli, Hyderabad",
  "Madhapur, Hyderabad",
  "HITEC City, Hyderabad",
  "Hinjawadi, Pune",
  "Kothrud, Pune",
  "Baner, Pune",
  "OMR, Chennai",
  "Velachery, Chennai",
];

type Errors = Partial<Record<"name" | "age" | "gender" | "location", string>>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear that field's error as the user fixes it.
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Add your name";
    const ageNum = parseInt(form.age, 10);
    if (!form.age) next.age = "Add your age";
    else if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 60)
      next.age = "Must be 18–60";
    if (!form.gender) next.gender = "Pick one";
    if (!form.location.trim()) next.location = "Where do you want to live?";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setLoading(true);
    try {
      await api.createProfile({
        name: form.name.trim(),
        age: parseInt(form.age, 10),
        gender: form.gender,
        location: form.location.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  // Welcome / "what now" state — replaces the form on success so the user
  // gets context before being dropped into the explore grid cold.
  if (done) {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center">
        <PageTitle title="Welcome to Livong" />
        <div className="max-w-sm mx-auto w-full text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-surface mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Welcome, {form.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-dim mb-6 leading-relaxed">
            Your profile is set up. You can add lifestyle preferences (sleep, food, cleanliness) any time from your profile to get better matches.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/explore")}
              className="btn-accent w-full py-3 rounded-lg text-sm font-medium"
            >
              Browse listings
            </button>
            <button
              onClick={() => router.push("/create-listing")}
              className="w-full py-3 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface-alt transition-colors"
            >
              I have a room to share
            </button>
            <Link
              href="/profile"
              className="block w-full py-3 text-xs text-dim hover:text-secondary transition-colors"
            >
              Add lifestyle preferences first →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <PageTitle title="Set up your profile" />
      <div className="max-w-sm md:max-w-lg lg:max-w-xl mx-auto animate-fade-in-up">
        {/* Single-segment progress bar — matches "Step 1 of 1" copy below.
            Was 3 segments earlier when this assumed a multi-step flow. */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 flex-1 bg-accent rounded-full" />
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-2">
            Step 1 of 1 · One-time setup
          </p>
          <h1 className="text-xl font-semibold text-foreground">Set up your profile</h1>
          <p className="text-dim text-sm mt-1 leading-relaxed">
            Just the basics to get you started. You can add lifestyle prefs (sleep, food, cleanliness) later from your profile — they make matches better but aren&apos;t required to browse.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your name"
            error={errors.name}
          />

          {/* Age + Gender side-by-side on tablet/desktop, stacked on mobile
              so each tap target gets full-width comfort on small screens. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Age"
              // type="text" + inputMode="numeric" — type="number" surfaces the
              // symbol-heavy keyboard on iOS, numeric is the right keyboard.
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={form.age}
              onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="25"
              error={errors.age}
            />
            <Select
              label="Gender"
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(v) => update("gender", v)}
              placeholder="Select"
              error={errors.gender}
            />
          </div>

          <div>
            <Input
              label="Preferred Location"
              type="text"
              list="location-suggestions"
              autoComplete="off"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. HSR Layout, Bangalore"
              error={errors.location}
            />
            <datalist id="location-suggestions">
              {LOCATION_SUGGESTIONS.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            <p className="text-[11px] text-dim mt-1.5">
              Pick from suggestions for best matches — typos break location search.
            </p>
          </div>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" loading={loading} fullWidth size="lg">
            {loading ? "Creating..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
