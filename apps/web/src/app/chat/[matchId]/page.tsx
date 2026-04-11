"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = await api.getMessages(matchId);
      setMessages(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.sendMessage(matchId, newMessage.trim());
      setNewMessage("");
      await fetchMessages();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleShareContact = async () => {
    if (!shareValue.trim() || sharing) return;
    setSharing(true);
    try {
      await api.shareContact(matchId, shareType, shareValue.trim());
      setShowShareModal(false);
      setShareValue("");
      await fetchMessages();
    } catch {
      // ignore
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

  return (
    <div className="flex flex-col h-screen bg-background lg:max-w-3xl lg:mx-auto lg:border-x lg:border-border">
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
        <div className="w-9 h-9 bg-neutral-900 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className="font-medium text-sm text-foreground">Chat</h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-[10px] text-dim">Online</span>
          </div>
        </div>
      </div>

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
                      ? "bg-neutral-900 text-white rounded-2xl rounded-br-md"
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

      {/* Input */}
      <div className="bg-surface border-t border-border px-4 py-3">
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
            className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm outline-none focus:border-muted focus:shadow-[0_0_0_2px_var(--ring)] transition-all placeholder:text-faint text-foreground"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary px-4 py-2.5 rounded-lg disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="m22 2-11 11" />
            </svg>
          </button>
        </form>
      </div>

      {/* Share Contact Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Share Contact Info</h3>
              <button
                onClick={() => { setShowShareModal(false); setShareValue(""); }}
                className="text-dim hover:text-secondary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShareType("phone")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  shareType === "phone"
                    ? "bg-neutral-900 text-white"
                    : "bg-surface-alt text-muted hover:bg-border"
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setShareType("email")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  shareType === "email"
                    ? "bg-neutral-900 text-white"
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
              className="w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-sm outline-none focus:border-muted focus:shadow-[0_0_0_2px_var(--ring)] transition-all placeholder:text-faint text-foreground"
              autoFocus
            />

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
          </div>
        </div>
      )}
    </div>
  );
}
