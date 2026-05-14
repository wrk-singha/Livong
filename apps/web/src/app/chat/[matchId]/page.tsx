"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { useAuth } from "@/contexts/auth";
import { useChatStream } from "@/lib/useChatStream";
import { Modal, StarRatingPicker, Avatar, BackButton, Alert } from "@/components/ui";
import { ReportModal } from "@/components/ReportModal";

type Message = {
  id: string;
  senderId: string;
  message: string;
  messageType: string;
  createdAt: string;
};

type ContactData = {
  contactType: string;
  contactValue: string;
};

type MatchInfo = {
  matchId: string;
  listingId: string;
  user: { id: string; name: string };
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const matchId = params.matchId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<"phone" | "email">("phone");
  const [shareValue, setShareValue] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [actionError, setActionError] = useState("");
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const queryClient = useQueryClient();
  const blockMutation = useMutation({
    mutationFn: () => api.blockUser(matchInfo!.user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.push("/matches");
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : "Couldn't block user"),
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>("");

  const fetchMessages = useCallback(async (since?: string) => {
    try {
      const data = await api.getMessages(matchId, since);
      if (since && data.length > 0) {
        setMessages((prev) => {
          // Dedup by id (re-fetch overlap) AND replace any optimistic "temp-*"
          // message whose content + sender matches a real server message.
          // Without this, sent messages briefly render twice on the next 5s poll
          // because the optimistic id never matches the server's real UUID.
          const existingIds = new Set(prev.map((m) => m.id));
          const trulyNew = data.filter((m: Message) => !existingIds.has(m.id));
          if (trulyNew.length === 0) return prev;

          const merged = [...prev];
          for (const incoming of trulyNew) {
            const tempIdx = merged.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.senderId === incoming.senderId &&
                m.message === incoming.message
            );
            if (tempIdx !== -1) {
              merged[tempIdx] = incoming; // swap optimistic for canonical
            } else {
              merged.push(incoming);
            }
          }
          return merged;
        });
      } else if (!since) {
        setMessages(data || []);
      }
      if (data.length > 0) {
        lastTimestampRef.current = data[data.length - 1].createdAt;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // WS push: when the server tells us there are new messages for this match,
  // immediately fetch the delta. Hook returns connected=true once subscribed,
  // which we use to stretch the polling interval (60s safety net) instead of
  // dropping it entirely — covers WS gaps without doubling the work.
  const onWSInvalidate = useCallback(() => {
    fetchMessages(lastTimestampRef.current || undefined);
  }, [fetchMessages]);
  const { connected: wsConnected } = useChatStream(matchId, onWSInvalidate);

  useEffect(() => {
    fetchMessages();
    // 5s when WS is down (close to live feel), 60s when WS is doing the work
    // (just a heartbeat/safety net in case a push was missed).
    const intervalMs = wsConnected ? 60000 : 5000;
    const interval = setInterval(() => {
      fetchMessages(lastTimestampRef.current || undefined);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [matchId, fetchMessages, wsConnected]);

  useEffect(() => {
    api.getMatches().then((matches) => {
      const found = matches.find((m: MatchInfo) => m.matchId === matchId);
      if (found) setMatchInfo(found);
    }).catch(() => {});
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const text = newMessage.trim();
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      senderId: userId!,
      message: text,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    setSending(true);
    setActionError("");
    try {
      await api.sendMessage(matchId, text);
      lastTimestampRef.current = optimistic.createdAt;
    } catch (err) {
      // Roll back optimistic message + restore the input so user can retry.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setNewMessage(text);
      setActionError(err instanceof Error ? err.message : "Couldn't send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleShareContact = async () => {
    if (!shareValue.trim() || sharing) return;
    setSharing(true);
    setActionError("");
    try {
      await api.shareContact(matchId, shareType, shareValue.trim());
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        senderId: userId!,
        message: JSON.stringify({ contactType: shareType, contactValue: shareValue.trim() }),
        messageType: "contact_share",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      lastTimestampRef.current = optimistic.createdAt;
      setShowShareModal(false);
      setShareValue("");
    } catch (err) {
      // Modal stays open + value retained so the user can retry.
      setActionError(err instanceof Error ? err.message : "Couldn't share contact. Try again.");
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const parseContact = (msg: Message): ContactData | null => {
    if (msg.messageType !== "contact_share") return null;
    try {
      return JSON.parse(msg.message);
    } catch {
      return null;
    }
  };

  const handleSubmitReview = async () => {
    if (!matchInfo || reviewRating === 0 || reviewSubmitting) return;
    setReviewSubmitting(true);
    setActionError("");
    try {
      await api.createReview(matchInfo.listingId, reviewRating, reviewComment.trim() || undefined);
      setReviewDone(true);
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewRating(0);
        setReviewComment("");
      }, 1500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't submit review. Try again.");
      setShowReviewModal(false);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background lg:max-w-3xl lg:mx-auto lg:border-x lg:border-border">
      <PageTitle title={matchInfo?.user?.name ? `Chat with ${matchInfo.user.name}` : "Chat"} />
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.push("/matches")}
          className="p-1.5 -ml-1 text-dim hover:text-secondary transition-colors rounded-lg hover:bg-surface-alt"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className="font-medium text-sm text-foreground truncate max-w-[180px] sm:max-w-none">
            {matchInfo?.user?.name || "Chat"}
          </h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-dot" />
            <span className="text-[10px] text-dim">Online</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-accent bg-accent-surface rounded-lg hover:opacity-80 transition-opacity"
          >
            Leave Review
          </button>
          {/* Safety menu — three-dot, opens Report / Block */}
          <div className="relative">
            <button
              onClick={() => setShowSafetyMenu((v) => !v)}
              className="p-1.5 rounded-lg text-dim hover:text-secondary hover:bg-surface-alt transition-colors"
              aria-label="Safety actions"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {showSafetyMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSafetyMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { setShowSafetyMenu(false); setShowReport(true); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-secondary hover:bg-surface-alt transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                    Report
                  </button>
                  <button
                    onClick={() => { setShowSafetyMenu(false); setShowBlockConfirm(true); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-error hover:bg-error-surface transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    Block
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action error banner — covers send / share-contact / review failures */}
      {actionError && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-start gap-2 bg-error-surface border border-error-border text-error text-xs rounded-lg px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
            <span className="flex-1">{actionError}</span>
            <button
              onClick={() => setActionError("")}
              className="text-error/70 hover:text-error"
              aria-label="Dismiss error"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-8 h-8 border-3 border-border border-t-secondary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-3 text-dim">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-dim">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-2.5">
          {messages.map((msg) => {
            const isMine = msg.senderId === userId;
            const contact = parseContact(msg);

            if (contact) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} animate-slide-in`}
                >
                  <div className="max-w-[80%] bg-surface border border-border rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-surface-alt rounded-lg flex items-center justify-center text-secondary">
                        {contact.contactType === "phone" ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-muted">
                        {isMine ? "You" : "They"} shared {contact.contactType === "phone" ? "a phone number" : "an email"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm font-medium text-secondary font-mono">
                        {contact.contactValue}
                      </span>
                      <button
                        onClick={() => copyToClipboard(contact.contactValue, msg.id)}
                        className="text-xs font-medium text-secondary hover:text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border transition-all"
                      >
                        {copied === msg.id ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[10px] text-faint mt-1.5">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} animate-slide-in`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-accent text-white rounded-2xl rounded-br-md"
                      : "bg-surface text-secondary rounded-2xl rounded-bl-md border border-border"
                  }`}
                >
                  <p className="leading-relaxed">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-dim" : "text-faint"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — pad bottom for iOS home indicator + system safe area so the
          send/share buttons don't hug the screen edge or get covered by browser
          chrome on PWA installs. */}
      <div className="bg-surface border-t border-border px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-2.5 bg-surface border border-border rounded-lg text-dim hover:text-secondary hover:border-muted transition-colors"
            title="Share contact info"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)] transition-all placeholder:text-faint text-foreground"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            aria-label="Send message"
            // btn-accent (purple) instead of btn-primary (black) so the active
            // send action reads as the primary purple accent like the rest of
            // the app's CTAs. Disabled state stays at 50% opacity so it's
            // clearly inactive but still visibly a button.
            className="btn-accent px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="m22 2-11 11" />
            </svg>
          </button>
        </form>
      </div>

      {/* Share Contact Modal */}
      <Modal
        open={showShareModal}
        onClose={() => { setShowShareModal(false); setShareValue(""); }}
        title="Share Contact Info"
      >
            <div className="flex gap-2">
              <button
                onClick={() => setShareType("phone")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  shareType === "phone"
                    ? "bg-accent text-white"
                    : "bg-surface-alt text-muted hover:bg-border"
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setShareType("email")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  shareType === "email"
                    ? "bg-accent text-white"
                    : "bg-surface-alt text-muted hover:bg-border"
                }`}
              >
                Email
              </button>
            </div>

            <input
              type={shareType === "phone" ? "tel" : "email"}
              value={shareValue}
              onChange={(e) => setShareValue(e.target.value)}
              placeholder={shareType === "phone" ? "+1 (555) 123-4567" : "you@example.com"}
              className="input"
              autoFocus
            />

            <div className="bg-warning-surface border border-warning rounded-lg p-3 text-[12px] text-warning leading-relaxed space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Stay safe
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-secondary">
                <li>Meet first in a public place — never alone in a private home.</li>
                <li>Never share OTPs, bank details, or pay rent before viewing the property in person.</li>
                <li>Livong staff will never ask for your OTP.</li>
                <li>Report anyone asking for money upfront or behaving suspiciously.</li>
              </ul>
            </div>
            <p className="text-[11px] text-dim leading-snug">
              This will share your {shareType === "phone" ? "phone number" : "email address"} with your match. They&apos;ll be able to contact you directly.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowShareModal(false); setShareValue(""); }}
                className="flex-1 py-2.5 bg-surface-alt text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShareContact}
                disabled={!shareValue.trim() || sharing}
                className="flex-1 py-2.5 btn-primary rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {sharing ? "Sharing..." : "Share"}
              </button>
            </div>
      </Modal>

      {/* Leave Review Modal */}
      <Modal
        open={showReviewModal}
        onClose={() => { setShowReviewModal(false); setReviewRating(0); setReviewComment(""); setReviewDone(false); }}
        title="Leave a Review"
      >
        {reviewDone ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-success-surface rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success-text">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Review submitted!</p>
            <p className="text-xs text-dim mt-1">Thanks for your feedback</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-secondary">How was your experience with this roommate?</p>

            <StarRatingPicker rating={reviewRating} onChange={setReviewRating} />

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)] transition-all placeholder:text-faint text-foreground resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setShowReviewModal(false); setReviewRating(0); setReviewComment(""); }}
                className="flex-1 py-2.5 bg-surface-alt text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewRating === 0 || reviewSubmitting}
                className="flex-1 py-2.5 btn-primary rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Safety: Report message — uses the user as the target since "report a
          specific message" is uncommon vs "report the user". */}
      {matchInfo && (
        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          targetType="profile"
          targetId={matchInfo.user.id}
          context={`Conversation with ${matchInfo.user.name}`}
        />
      )}

      {/* Block confirmation — separate from Report so the user can do either. */}
      <Modal open={showBlockConfirm} onClose={() => setShowBlockConfirm(false)} title={`Block ${matchInfo?.user?.name || "this user"}?`}>
        <div className="space-y-3">
          <p className="text-sm text-secondary leading-relaxed">
            They won&apos;t be able to message you, and you won&apos;t see their listings or future messages from them. You can unblock from your profile settings.
          </p>
          <p className="text-xs text-dim">
            Blocking is private — they aren&apos;t notified.
          </p>
          {blockMutation.error && (
            <Alert>{blockMutation.error instanceof Error ? blockMutation.error.message : "Couldn't block. Try again."}</Alert>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 py-2.5 bg-surface-alt text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors"
              disabled={blockMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {blockMutation.isPending ? "Blocking..." : "Block user"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
