"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import type { RentGroupDetail, RentMember, RentPayment, MatchedUser, RentCommission } from "@/lib/types";
import {
  PageSpinner, BackButton, Alert, Input, Button, Modal, Badge, Avatar, EmptyState, ErrorState,
} from "@/components/ui";

export default function RentGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");

  const { data: group, isLoading, error: groupError, refetch: refetchGroup } = useQuery<RentGroupDetail>({
    queryKey: ["rent-group", id],
    queryFn: () => api.getRentGroup(id),
    retry: false,
  });

  const { data: payments = [] } = useQuery<RentPayment[]>({
    queryKey: ["rent-payments", id, selectedMonth],
    queryFn: () => api.getRentPayments(id, selectedMonth || undefined),
    enabled: !!id,
  });

  const { data: commissions = [] } = useQuery<RentCommission[]>({
    queryKey: ["rent-commissions", id],
    queryFn: () => api.getCommissions(id),
    enabled: !!id && group?.commissionAmount != null,
  });

  const collectMutation = useMutation({
    mutationFn: (commissionId: string) => api.collectCommission(commissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rent-commissions", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRentGroup(id),
    onSuccess: () => router.push("/rent"),
  });

  const verifyMutation = useMutation({
    mutationFn: (paymentId: string) => api.verifyRentPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rent-group", id] });
      queryClient.invalidateQueries({ queryKey: ["rent-payments", id] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeRentMember(id, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rent-group", id] }),
  });

  // Distinguish loading / not-found / network-error / loaded.
  if (isLoading) return <PageSpinner />;
  if (groupError) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
          <BackButton />
          <ErrorState
            title="Couldn't load this rent group"
            subtitle="The group may not exist, or there was a network problem."
            onRetry={() => refetchGroup()}
          />
        </div>
      </div>
    );
  }
  if (!group) return null;

  const isCreator = group.createdBy === userId;
  const currentMonth = group.month;
  const myMember = group.members.find((m) => m.userId === userId);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        <BackButton />

        {/* Header */}
        <div className="flex items-start justify-between mt-3 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {group.name || group.listingTitle || "Rent Group"}
            </h1>
            {group.listingLocation && (
              <p className="text-xs text-dim mt-0.5 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {group.listingLocation}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted">
              <span className="font-semibold text-foreground text-base">₹{group.totalRent.toLocaleString()}</span>
              <span>Due on {group.dueDay}{ordinalSuffix(group.dueDay)}</span>
              {group.overdue && <Badge variant="error">Overdue</Badge>}
              {group.commissionAmount != null && <Badge variant="accent">Broker</Badge>}
            </div>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-error hover:text-error/80 transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>

        {/* Mutation errors — money/membership actions must never fail silently */}
        {(verifyMutation.error || collectMutation.error || removeMemberMutation.error || deleteMutation.error) && (
          <Alert className="mb-4">
            {(verifyMutation.error as Error | null)?.message ||
              (collectMutation.error as Error | null)?.message ||
              (removeMemberMutation.error as Error | null)?.message ||
              (deleteMutation.error as Error | null)?.message ||
              "Action failed. Please try again."}
          </Alert>
        )}

        {/* Members section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Members</h2>
            {isCreator && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-xs text-accent font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {group.members.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                isCreator={isCreator}
                currentUserId={userId!}
                groupCreatorId={group.createdBy}
                onRemove={() => removeMemberMutation.mutate(member.userId)}
                onVerify={
                  member.paymentId && member.userId !== userId
                    ? () => verifyMutation.mutate(member.paymentId!)
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* Record payment */}
        {myMember && myMember.paymentStatus === "unpaid" && (
          <button
            onClick={() => setShowRecordPayment(true)}
            className="btn-primary w-full py-3 rounded-lg text-sm font-medium mb-6"
          >
            Record My Payment for {formatMonth(currentMonth)}
          </button>
        )}
        {myMember && myMember.paymentStatus === "pending" && (
          <div className="bg-warning-surface border border-warning rounded-lg p-3 text-center text-xs text-warning mb-6">
            Your payment for {formatMonth(currentMonth)} is pending verification
          </div>
        )}
        {myMember && myMember.paymentStatus === "verified" && (
          <div className="bg-success-surface border border-success-text rounded-lg p-3 text-center text-xs text-success-text mb-6">
            Your payment for {formatMonth(currentMonth)} is verified
          </div>
        )}

        {/* Payment History */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Payment History</h2>
          {payments.length === 0 ? (
            <p className="text-xs text-dim text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  currentUserId={userId!}
                  onVerify={
                    payment.status === "pending" && payment.payerId !== userId
                      ? () => verifyMutation.mutate(payment.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Commission Section — Broker only */}
        {group.commissionAmount != null && isCreator && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Commission</h2>
            <div className="bg-surface-alt rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Base Rent</span>
                <span>₹{group.baseRent?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Type</span>
                <span className="capitalize">{group.commissionType} {group.commissionType === "percentage" ? `(${group.commissionValue}%)` : ""}</span>
              </div>
              <div className="border-t border-border pt-1 mt-1 flex items-center justify-between text-xs font-semibold text-accent">
                <span>Monthly Commission</span>
                <span>₹{group.commissionAmount.toLocaleString()}</span>
              </div>
            </div>

            {commissions.length > 0 && (
              <div className="space-y-2">
                {commissions.map((comm) => (
                  <div key={comm.id} className="card px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{formatMonth(comm.month)}</p>
                      <p className="text-[11px] text-muted">₹{comm.amount.toLocaleString()}</p>
                    </div>
                    {comm.status === "collected" ? (
                      <Badge variant="success">Collected</Badge>
                    ) : (
                      <button
                        onClick={() => collectMutation.mutate(comm.id)}
                        className="text-[11px] font-medium text-accent hover:opacity-80 transition-opacity"
                      >
                        Mark Collected
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {commissions.length === 0 && (
              <p className="text-xs text-dim text-center py-3">
                Commission records are auto-created when all members&apos; payments are verified
              </p>
            )}
          </section>
        )}

        {/* Modals */}
        {showAddMember && (
          <AddMemberModal
            open={showAddMember}
            groupId={id}
            onClose={() => setShowAddMember(false)}
            onAdded={() => {
              setShowAddMember(false);
              queryClient.invalidateQueries({ queryKey: ["rent-group", id] });
            }}
          />
        )}

        {showRecordPayment && myMember && (
          <RecordPaymentModal
            open={showRecordPayment}
            groupId={id}
            month={currentMonth}
            defaultAmount={myMember.shareAmount}
            onClose={() => setShowRecordPayment(false)}
            onRecorded={() => {
              setShowRecordPayment(false);
              queryClient.invalidateQueries({ queryKey: ["rent-group", id] });
              queryClient.invalidateQueries({ queryKey: ["rent-payments", id] });
            }}
          />
        )}

        <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Group">
          <p className="text-sm text-secondary mb-4">
            This will permanently delete this rent group and all payment records. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowDeleteConfirm(false)} variant="ghost" fullWidth>
              Cancel
            </Button>
            <Button
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
              className="bg-error text-white hover:bg-error/90"
              fullWidth
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* ── Member Card ── */
function MemberCard({
  member,
  isCreator,
  currentUserId,
  groupCreatorId,
  onRemove,
  onVerify,
}: {
  member: RentMember;
  isCreator: boolean;
  currentUserId: string;
  groupCreatorId: string;
  onRemove: () => void;
  onVerify?: () => void;
}) {
  const statusConfig = {
    unpaid: { label: "Unpaid", className: "bg-surface-alt text-muted" },
    pending: { label: "Pending", className: "bg-warning-surface text-warning" },
    verified: { label: "Verified", className: "bg-success-surface text-success-text" },
  };
  const status = statusConfig[member.paymentStatus];
  const canRemove = isCreator && member.userId !== groupCreatorId;
  const isSelf = member.userId === currentUserId;

  return (
    <div className="card p-3 flex items-center gap-3">
      <Avatar name={member.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">
            {member.name}{isSelf && " (You)"}
          </span>
          {member.role === "owner" && (
            <span className="text-[9px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded">Owner</span>
          )}
        </div>
        <p className="text-xs text-dim">₹{member.shareAmount.toLocaleString()}/mo</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
          {status.label}
        </span>
        {onVerify && member.paymentStatus === "pending" && (
          <button
            onClick={onVerify}
            className="text-[10px] font-medium text-success-text hover:opacity-80 transition-opacity"
          >
            Verify
          </button>
        )}
        {canRemove && (
          <button onClick={onRemove} className="text-dim hover:text-error transition-colors p-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Payment Card ── */
function PaymentCard({
  payment,
  currentUserId,
  onVerify,
}: {
  payment: RentPayment;
  currentUserId: string;
  onVerify?: () => void;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={payment.payerName} size="sm" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {payment.payerName}{payment.payerId === currentUserId && " (You)"}
            </p>
            <p className="text-[10px] text-dim">
              {formatMonth(payment.month)} · {payment.paymentMethod}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">₹{payment.amount.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 justify-end">
            <span
              className={`text-[10px] font-medium ${
                payment.status === "verified" ? "text-success-text" : "text-warning"
              }`}
            >
              {payment.status === "verified" ? "Verified" : "Pending"}
            </span>
            {onVerify && (
              <button
                onClick={onVerify}
                className="text-[10px] font-medium text-accent hover:opacity-80 transition-opacity"
              >
                Verify
              </button>
            )}
          </div>
        </div>
      </div>
      {payment.note && <p className="text-xs text-muted mt-2 pl-9">{payment.note}</p>}
    </div>
  );
}

/* ── Add Member Modal ── */
function AddMemberModal({
  open,
  groupId,
  onClose,
  onAdded,
}: {
  open: boolean;
  groupId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [shareAmount, setShareAmount] = useState("");
  const [role, setRole] = useState("tenant");
  const [error, setError] = useState("");

  const { data: matchedUsers = [] } = useQuery<MatchedUser[]>({
    queryKey: ["matched-users", groupId],
    queryFn: () => api.getMatchedUsers(groupId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.addRentMember(groupId, {
        userId: selectedUser,
        shareAmount: parseInt(shareAmount),
        role,
      }),
    onSuccess: () => onAdded(),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to add member"),
  });

  const handleSubmit = () => {
    setError("");
    if (!selectedUser || !shareAmount) {
      setError("Select a user and enter share amount");
      return;
    }
    addMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Select User</label>
          {matchedUsers.length === 0 ? (
            <p className="text-xs text-dim">No matched users available to add.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {matchedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm ${
                    selectedUser === u.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-secondary hover:border-border-light"
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          label="Share Amount (₹)"
          type="number"
          value={shareAmount}
          onChange={(e) => setShareAmount(e.target.value)}
          placeholder="10000"
        />
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
          <div className="flex gap-2">
            {["tenant", "owner"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 text-center px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  role === r
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-secondary hover:border-border-light"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        <Button onClick={handleSubmit} loading={addMutation.isPending} fullWidth>
          Add Member
        </Button>
      </div>
    </Modal>
  );
}

/* ── Record Payment Modal ── */
function RecordPaymentModal({
  open,
  groupId,
  month,
  defaultAmount,
  onClose,
  onRecorded,
}: {
  open: boolean;
  groupId: string;
  month: string;
  defaultAmount: number;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("online");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordRentPayment(groupId, {
        amount: parseInt(amount),
        month,
        paymentMethod: method,
        note: note || undefined,
      }),
    onSuccess: () => onRecorded(),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to record payment"),
  });

  const handleSubmit = () => {
    setError("");
    if (!amount || parseInt(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    recordMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Payment for ${formatMonth(month)}`}>
      <div className="space-y-4">
        <Input
          label="Amount (₹)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
        />
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Payment Method</label>
          <div className="flex gap-2">
            {["online", "upi", "offline"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 text-center px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  method === m
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-secondary hover:border-border-light"
                }`}
              >
                {m === "upi" ? "UPI" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Note (optional)"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Paid via Google Pay"
        />
        {error && <Alert>{error}</Alert>}
        <Button onClick={handleSubmit} loading={recordMutation.isPending} fullWidth>
          Record Payment
        </Button>
      </div>
    </Modal>
  );
}

/* ── Helpers ── */
function ordinalSuffix(n: number) {
  if (n > 3 && n < 21) return "th";
  const s = ["th", "st", "nd", "rd"];
  return s[n % 10] || s[0];
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${year}`;
}
