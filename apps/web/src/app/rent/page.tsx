"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { useAuth } from "@/contexts/auth";
import { useProfile } from "@/contexts/profile";
import type { RentGroup } from "@/lib/types";
import { PageSpinner, EmptyState, Alert, Input, Button, Modal } from "@/components/ui";

export default function RentPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: groups, isLoading } = useQuery<RentGroup[]>({
    queryKey: ["rent-groups"],
    queryFn: () => api.getRentGroups(),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <PageTitle title="Rent" />
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Rent</h1>
            <p className="text-xs text-dim mt-0.5">Track and split rent with roommates</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Group
          </button>
        </div>

        {!groups || groups.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M12 12h.01" />
                <path d="M17 12h.01" />
                <path d="M7 12h.01" />
              </svg>
            }
            title="No rent groups yet"
            subtitle="Create a rent group to start tracking payments with your roommates"
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const progress = group.memberCount > 0 ? (group.paidCount / group.memberCount) * 100 : 0;
              return (
                <Link key={group.id} href={`/rent/${group.id}`} className="card p-4 block group hover:border-border transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {group.name || group.listingTitle || "Rent Group"}
                      </h3>
                      {group.listingLocation && (
                        <p className="text-xs text-dim mt-0.5 flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {group.listingLocation}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-base font-bold text-foreground">₹{group.totalRent.toLocaleString()}</p>
                      <p className="text-[10px] text-dim">due on {group.dueDay}{ordinalSuffix(group.dueDay)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted font-medium">
                        {group.paidCount}/{group.memberCount} paid
                      </span>
                      {group.overdue && (
                        <span className="text-[10px] font-medium text-error flex items-center gap-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                          </svg>
                          Overdue
                        </span>
                      )}
                      {!group.overdue && group.paidCount === group.memberCount && group.memberCount > 0 && (
                        <span className="text-[10px] font-medium text-success-text flex items-center gap-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          All paid
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          group.overdue ? "bg-error" : progress === 100 ? "bg-success-text" : "bg-accent"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Commission info for broker */}
                  {group.commissionAmount != null && (
                    <div className="mt-2 flex items-center justify-between bg-surface-alt rounded-md px-2.5 py-1.5">
                      <span className="text-[10px] text-muted font-medium">Commission</span>
                      <span className="text-[11px] font-semibold text-accent">₹{group.commissionAmount.toLocaleString()}/mo</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {showCreate && (
          <CreateGroupModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["rent-groups"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

function ordinalSuffix(n: number) {
  if (n > 3 && n < 21) return "th";
  const s = ["th", "st", "nd", "rd"];
  return s[n % 10] || s[0];
}

function CreateGroupModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { userId } = useAuth();
  const { profile } = useProfile();
  const [form, setForm] = useState({ listingId: "", name: "", totalRent: "", dueDay: "1", baseRent: "", commissionType: "percentage" as "percentage" | "flat", commissionValue: "" });
  const [enableCommission, setEnableCommission] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  // Scroll the error into view + flash so users on long modals don't miss it.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  // Fetch all listings and filter to user's own
  const { data: allListings = [] } = useQuery({
    queryKey: ["listings-for-rent"],
    queryFn: () => api.getListings(),
  });
  const listings = allListings.filter((l: { userId: string }) => l.userId === userId);

  // Auto-calculate total rent when commission fields change
  const calculatedTotal = enableCommission && form.baseRent && form.commissionValue
    ? form.commissionType === "percentage"
      ? Math.round(parseInt(form.baseRent) + parseInt(form.baseRent) * parseInt(form.commissionValue) / 100)
      : parseInt(form.baseRent) + parseInt(form.commissionValue)
    : 0;

  const createMutation = useMutation({
    mutationFn: () =>
      api.createRentGroup({
        listingId: form.listingId || undefined,
        name: form.name || undefined,
        totalRent: enableCommission ? calculatedTotal : parseInt(form.totalRent),
        dueDay: parseInt(form.dueDay) || 1,
        ...(enableCommission ? {
          baseRent: parseInt(form.baseRent),
          commissionType: form.commissionType,
          commissionValue: parseInt(form.commissionValue),
        } : {}),
      }),
    onSuccess: () => onCreated(),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create group"),
  });

  const handleSubmit = () => {
    setError("");
    if (enableCommission) {
      if (!form.baseRent) { setError("Enter base rent"); return; }
      if (!form.commissionValue) { setError("Enter commission value"); return; }
      if (calculatedTotal <= 0) { setError("Invalid rent calculation"); return; }
    } else {
      if (!form.totalRent) { setError("Enter rent amount"); return; }
    }
    if (!form.listingId && !form.name) {
      setError("Name is required for standalone groups");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Rent Group">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Link to Listing (optional)</label>
          <div className="space-y-1.5">
            {listings.length === 0 ? (
              <p className="text-xs text-dim">No listings found. You can create a standalone group.</p>
            ) : (
              listings.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, listingId: p.listingId === l.id ? "" : l.id }))}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                    form.listingId === l.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-secondary hover:border-border-light"
                  }`}
                >
                  <p className="font-medium text-xs">{l.title}</p>
                  <p className="text-[10px] text-dim mt-0.5">{l.location}</p>
                </button>
              ))
            )}
          </div>
        </div>
        <Input
          label={form.listingId ? "Group Name (optional)" : "Group Name *"}
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. HSR 2BHK Rent"
        />

        {/* Broker Commission Toggle */}
        {profile?.isBroker && (
          <div>
            <button
              type="button"
              onClick={() => setEnableCommission((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                enableCommission
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface text-secondary hover:border-border-light"
              }`}
            >
              <span className="font-medium text-xs">Add Broker Commission</span>
              <div className={`w-8 h-4.5 rounded-full transition-colors ${enableCommission ? "bg-accent" : "bg-border"}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${enableCommission ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        )}

        {enableCommission ? (
          <>
            <Input
              label="Base Rent (₹) *"
              type="number"
              value={form.baseRent}
              onChange={(e) => setForm((p) => ({ ...p, baseRent: e.target.value }))}
              placeholder="25000"
            />
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Commission Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["percentage", "flat"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, commissionType: type }))}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.commissionType === type
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-secondary hover:border-border-light"
                    }`}
                  >
                    {type === "percentage" ? "Percentage (%)" : "Flat (₹)"}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label={form.commissionType === "percentage" ? "Commission (%)" : "Commission Amount (₹)"}
              type="number"
              value={form.commissionValue}
              onChange={(e) => setForm((p) => ({ ...p, commissionValue: e.target.value }))}
              placeholder={form.commissionType === "percentage" ? "10" : "5000"}
            />
            {calculatedTotal > 0 && (
              <div className="bg-surface-alt rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted">
                  <span>Base Rent</span>
                  <span>₹{parseInt(form.baseRent).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Commission</span>
                  <span>₹{(calculatedTotal - parseInt(form.baseRent)).toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-semibold text-foreground">
                  <span>Total Rent</span>
                  <span>₹{calculatedTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
            <Input
              label="Due Day (1–28)"
              type="number"
              value={form.dueDay}
              onChange={(e) => setForm((p) => ({ ...p, dueDay: e.target.value }))}
              placeholder="1"
            />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Rent (₹) *"
              type="number"
              value={form.totalRent}
              onChange={(e) => setForm((p) => ({ ...p, totalRent: e.target.value }))}
              placeholder="30000"
            />
            <Input
              label="Due Day (1–28)"
              type="number"
              value={form.dueDay}
              onChange={(e) => setForm((p) => ({ ...p, dueDay: e.target.value }))}
              placeholder="1"
            />
          </div>
        )}

        {error && (
          <div ref={errorRef} className="animate-fade-in-up">
            <Alert>{error}</Alert>
          </div>
        )}
        <Button onClick={handleSubmit} loading={createMutation.isPending} fullWidth>
          Create Group
        </Button>
      </div>
    </Modal>
  );
}
