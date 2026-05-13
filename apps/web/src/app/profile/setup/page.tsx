"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { Input, Select, Alert, Button } from "@/components/ui";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.age || !form.gender || !form.location) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.createProfile({
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
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
          <p className="text-dim text-sm mt-1">
            We need a few basics so others can find compatible matches. Takes 30 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your name"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              type="number"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="25"
              min={18}
              max={60}
            />
            <Select
              label="Gender"
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(v) => update("gender", v)}
              placeholder="Select"
            />
          </div>

          <Input
            label="Preferred Location"
            type="text"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. HSR Layout, Bangalore"
          />

          {error && <Alert>{error}</Alert>}

          <Button type="submit" loading={loading} fullWidth size="lg">
            {loading ? "Creating..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
