"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, imageUrl } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { useAuth } from "@/contexts/auth";
import { useProfile, type Profile } from "@/contexts/profile";
import { Input, Select, Alert, Button, Modal } from "@/components/ui";

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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", location: "" });
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

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

  const startEditing = () => {
    if (!profile) return;
    setEditForm({ name: profile.name, location: profile.location });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!profile || !editForm.name.trim() || !editForm.location.trim()) return;
    setProfile({ ...profile, name: editForm.name, location: editForm.location });
    saveMutation.mutate({ name: editForm.name, location: editForm.location });
    setEditing(false);
  };

  // Profile completion
  const getCompletion = (p: Profile) => {
    const fields = ["avatar", "smoking", "drinking", "cleanliness", "sleepSchedule", "workSchedule", "pets", "foodPreference"];
    const filled = fields.filter((f) => p[f as keyof Profile]).length;
    return Math.round((filled / fields.length) * 100);
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
        <PageTitle title="Set up your profile" />
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

  const completion = getCompletion(profile);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10 pb-24 md:pb-6">
      <PageTitle title={profile?.name ? `${profile.name} · Profile` : "Profile"} />
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        {/* Save indicator */}
        {message && (
          <div className="fixed top-4 right-4 z-50 text-xs font-medium text-success-text bg-success-surface border border-success-border px-3 py-1.5 rounded-full animate-fade-in-up flex items-center gap-1.5">
            <CheckIcon />
            {message}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="card p-0 mb-5 overflow-hidden">
          {/* Cover gradient */}
          <div className="h-20 md:h-24" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-secondary))" }} />

          <div className="px-5 pb-5">
            {/* Avatar row — only avatar overlaps */}
            <div className="-mt-10 mb-3">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-20 h-20 rounded-2xl shrink-0 overflow-hidden group ring-4 ring-surface shadow-lg"
                disabled={avatarUploading}
              >
                {profile.avatar ? (
                  <img
                    src={imageUrl(profile.avatar)}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-neutral-900">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CameraIcon />
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
            </div>

            {/* Name & details — clearly on card surface */}
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="input py-1 px-2 text-base font-semibold w-full"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-foreground truncate">{profile.name}</h2>
                    <button onClick={startEditing} className="text-muted hover:text-secondary shrink-0">
                      <EditIcon />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm text-secondary">{profile.age}y · {profile.gender}</span>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <MapPinIcon />
                    {editing ? (
                      <input
                        value={editForm.location}
                        onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                        className="input py-0.5 px-1.5 text-sm w-28"
                      />
                    ) : (
                      profile.location
                    )}
                  </span>
                </div>
              </div>

              {editing && (
                <div className="flex gap-2 pb-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:bg-surface-alt"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Completion bar */}
            {completion < 100 && (
              <div className="mt-4 p-3 bg-surface-alt rounded-xl border border-border-light">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-secondary">Profile completion</span>
                  <span className="text-xs font-bold text-foreground">{completion}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completion}%`,
                      background: "linear-gradient(90deg, var(--accent), var(--accent-secondary))",
                    }}
                  />
                </div>
                <p className="text-[11px] text-dim mt-1.5">Complete your preferences to help find better matches</p>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">
            Lifestyle Preferences
          </h3>
          {saveMutation.isPending && (
            <div className="w-3 h-3 border-2 border-border border-t-secondary rounded-full animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {Object.entries(PREF_OPTIONS).map(([key, options]) => {
            const currentVal = profile[key as keyof Profile] as string | undefined;
            return (
              <div key={key} className="card p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ICONS[key]}</span>
                    <label className="text-sm font-medium text-secondary">
                      {LABELS[key]}
                    </label>
                  </div>
                  {currentVal && (
                    <span className="text-[10px] font-medium text-accent uppercase tracking-wider">
                      {currentVal}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => updatePref(key, opt)}
                        disabled={saveMutation.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          selected
                            ? "bg-accent/15 text-accent border border-accent/30"
                            : "bg-surface-alt text-muted hover:text-secondary border border-border-light"
                        }`}
                      >
                        {selected && <CheckIcon />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-border-light space-y-2">
          <button
            onClick={() => { clearProfile(); logout(); }}
            className="w-full py-2.5 text-dim text-sm font-medium hover:text-secondary transition-colors"
          >
            Log out
          </button>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full py-2.5 text-error text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Delete my account
          </button>
        </div>
      </div>

      <DeleteAccountModal
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={() => { clearProfile(); logout(); }}
      />
    </div>
  );
}

function DeleteAccountModal({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const required = "DELETE MY ACCOUNT";

  const handleDelete = async () => {
    if (confirm !== required || busy) return;
    setBusy(true); setErr("");
    try {
      await api.deleteAccount(confirm);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { setConfirm(""); setErr(""); onClose(); }} title="Delete your account">
      <div className="space-y-3">
        <p className="text-sm text-secondary leading-relaxed">
          This permanently removes your profile, listings, and contact info from Livong. Anonymised message records may be retained for safety reviews. <strong>This cannot be undone.</strong>
        </p>
        <p className="text-xs text-muted">
          Type <span className="font-mono font-semibold text-foreground">{required}</span> to confirm.
        </p>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={required}
          autoFocus
        />
        {err && <Alert>{err}</Alert>}
        <div className="flex gap-2">
          <button
            onClick={() => { setConfirm(""); setErr(""); onClose(); }}
            className="flex-1 py-2.5 bg-surface-alt text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirm !== required || busy}
            className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {busy ? "Deleting..." : "Delete forever"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
