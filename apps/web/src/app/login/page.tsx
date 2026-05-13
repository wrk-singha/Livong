"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { PageTitle } from "@/lib/PageTitle";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import Link from "next/link";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Strip the various ways an Indian number gets pasted into a 10-digit local
 * number: "+91 98765 43210" / "91-9876543210" / "098765 43210" → "9876543210".
 * The old code naively slice(0,10)'d after stripping non-digits, which kept
 * the leading "91" and silently truncated the real number.
 */
function normalizePastedPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // 12 digits starting with 91 → drop country code
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  // 11 digits starting with 0 → drop trunk prefix (legacy STD habit)
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(0, 10);
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggle } = useTheme();

  // Tick the resend cooldown down once per second while > 0.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.login(phone);
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await api.login(phone);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyOtp(phone, otp);
      login(res.token, res.userId);
      router.push("/explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <PageTitle title={step === "phone" ? "Sign in" : "Verify OTP"} />

      {/* Marketing panel — desktop only. Fills the left half of the screen
          with the same value props as the landing hero so the login feels
          continuous with the brand instead of a sterile form on a sea of grey. */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent/10 via-accent-secondary/5 to-transparent">
        <div className="m-auto max-w-md px-12 py-16">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">Livong</h2>
          <p className="text-base text-secondary leading-relaxed mb-10">
            Find people who actually fit how you live — not just what you can pay.
          </p>
          <ul className="space-y-5">
            {[
              { icon: "🇮🇳", title: "Made in India, free forever", desc: "No paywall, no ads, no third-party data sales." },
              { icon: "🚫", title: "Zero brokers, ever", desc: "Talk directly to the person renting the room." },
              { icon: "🔒", title: "OTP-verified users", desc: "Your number stays private until you choose to share it." },
            ].map((v) => (
              <li key={v.title} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{v.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{v.title}</p>
                  <p className="text-xs text-dim mt-0.5 leading-relaxed">{v.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form column */}
      <div className="flex-1 flex flex-col lg:w-1/2">

      {/* Header */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-dim hover:text-secondary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-dim hover:text-secondary hover:bg-surface-alt transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {step === "phone" ? "Sign in with your phone" : "Verify your number"}
            </h1>
            <p className="text-sm text-dim mt-1">
              {step === "phone"
                ? "We'll text you a 6-digit code. No password to remember."
                : <>OTP sent to <span className="font-medium text-secondary">+91 {phone}</span></>
              }
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="phone-input" className="block text-xs font-medium text-muted mb-1.5">
                  Phone Number
                </label>
                <div className="flex items-center border border-border rounded-lg overflow-hidden focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--ring)] transition-[border-color,box-shadow] bg-surface">
                  <span className="px-3.5 py-3 bg-surface-alt text-dim text-sm border-r border-border font-medium">
                    +91
                  </span>
                  <input
                    id="phone-input"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(normalizePastedPhone(e.target.value))}
                    placeholder="Enter your number"
                    aria-invalid={phone.length > 0 && phone.length < 10}
                    aria-describedby="phone-hint"
                    className="flex-1 px-3.5 py-3 outline-none text-sm text-secondary placeholder:text-faint bg-transparent"
                    autoFocus
                  />
                </div>
                {phone.length > 0 && phone.length < 10 && (
                  <p id="phone-hint" className="text-xs text-dim mt-1.5">
                    {10 - phone.length} more digit{10 - phone.length === 1 ? "" : "s"} to enable Continue
                  </p>
                )}
                <p className="text-[11px] text-dim mt-2 leading-relaxed">
                  Your number is private — never shared, never sold. We use it only to sign you in and to verify other users.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error text-sm bg-error-surface px-3 py-2 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="btn-primary w-full py-3 rounded-lg text-sm font-medium"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>

              <p className="text-[11px] text-dim text-center leading-relaxed">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-accent underline">Terms</Link> and{" "}
                <Link href="/privacy" className="text-accent underline">Privacy Policy</Link>.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">

              <div>
                <label htmlFor="otp-input" className="block text-xs font-medium text-muted mb-1.5">
                  Verification Code
                </label>
                <input
                  id="otp-input"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="• • • • • •"
                  className="input text-center text-lg tracking-[0.5em] font-medium py-3!"
                  autoFocus
                  aria-label="6-digit verification code"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error text-sm bg-error-surface px-3 py-2 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full py-3 rounded-lg text-sm font-medium"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              {/* Resend + change-number row. Resend is disabled with countdown
                  while the cooldown is active to prevent SMS spam. */}
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setResendCooldown(0);
                  }}
                  className="text-dim hover:text-secondary transition-colors"
                >
                  Change number
                </button>
                {resendCooldown > 0 ? (
                  <span className="text-dim">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-accent hover:underline disabled:opacity-60"
                  >
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
