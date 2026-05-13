"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Modal, Alert, Select } from "@/components/ui";

type TargetType = "listing" | "profile" | "message";

const REASONS: { value: string; label: string; help: string }[] = [
  { value: "harassment", label: "Harassment or abuse", help: "Threats, insults, unwanted contact" },
  { value: "scam", label: "Scam or money fraud", help: "Asked for money before viewing, fake listing, etc." },
  { value: "fake_profile", label: "Fake profile or listing", help: "Photos/details look stolen or made up" },
  { value: "inappropriate", label: "Inappropriate content", help: "Sexual, violent, or otherwise unsafe" },
  { value: "spam", label: "Spam", help: "Repeated unwanted messages or posts" },
  { value: "other", label: "Something else", help: "Describe the issue below" },
];

const TARGET_LABELS: Record<TargetType, string> = {
  listing: "this listing",
  profile: "this profile",
  message: "this message",
};

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  /** Optional note to show under the title — e.g. listing title or sender name. */
  context?: string;
  /** Called when the report is filed successfully. Modal auto-closes 1.5s after. */
  onReported?: () => void;
}

export function ReportModal({ open, onClose, targetType, targetId, context, onReported }: Props) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.reportTarget({
        targetType,
        targetId,
        reason: reason as Parameters<typeof api.reportTarget>[0]["reason"],
        details: details.trim() || undefined,
      }),
    onSuccess: () => {
      setDone(true);
      onReported?.();
      // Auto-close after 1.5s so user sees the confirmation
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
  });

  const handleClose = () => {
    setReason("");
    setDetails("");
    setDone(false);
    mutation.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason || mutation.isPending || done) return;
    if (reason === "other" && details.trim().length < 10) return; // require some context for "other"
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Report ${TARGET_LABELS[targetType]}`}>
      {done ? (
        <div className="space-y-3 text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-success-surface text-success-text flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <p className="text-sm font-medium text-foreground">Report received</p>
          <p className="text-xs text-dim">Our team will review within 24 hours. You can also block the user from chat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {context && (
            <p className="text-xs text-dim bg-surface-alt px-3 py-2 rounded-lg">
              <span className="text-faint">Reporting: </span>
              <span className="text-secondary truncate">{context}</span>
            </p>
          )}

          <div>
            <Select
              label="What's the issue?"
              value={reason}
              onChange={(v) => setReason(v)}
              placeholder="Select a reason"
              options={REASONS.map((r) => ({ value: r.value, label: r.label }))}
            />
            {reason && (
              <p className="text-[11px] text-dim mt-1.5">
                {REASONS.find((r) => r.value === reason)?.help}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Details {reason === "other" && <span className="text-error">*</span>}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              rows={3}
              maxLength={2000}
              placeholder={reason === "other" ? "Describe what happened (required)" : "Anything specific we should know? (optional)"}
              className="input resize-none w-full"
            />
            <p className="text-[10px] text-dim text-right mt-0.5">{details.length}/2000</p>
          </div>

          {mutation.error && (
            <Alert>
              {mutation.error instanceof Error ? mutation.error.message : "Couldn't file the report. Try again."}
            </Alert>
          )}

          <p className="text-[11px] text-dim leading-relaxed">
            Reports are reviewed by Livong staff. False reports may result in account action against the reporter.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 bg-surface-alt text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!reason || mutation.isPending || (reason === "other" && details.trim().length < 10)}
              className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {mutation.isPending ? "Sending..." : "Submit report"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
