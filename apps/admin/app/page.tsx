"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { admin } from "./lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (admin.hasToken()) {
      admin.getStats()
        .then(() => router.replace("/dashboard"))
        .catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [router]);

  const sendOTP = async () => {
    setError("");
    try {
      const data = await admin.sendOTP(phone);
      if (data.otp) setOtp(data.otp);
      setStep("otp");
    } catch {
      setError("Failed to send OTP");
    }
  };

  const verifyOTP = async () => {
    setError("");
    try {
      const data = await admin.verifyOTP(phone, otp);
      admin.setToken(data.token);
      // Verify this user is actually an admin
      try {
        await admin.getStats();
        router.push("/dashboard");
      } catch {
        localStorage.removeItem("admin_token");
        setError("This account is not an admin");
        setStep("phone");
        setOtp("");
      }
    } catch {
      setError("Invalid OTP");
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-xs">
        <h1 className="text-lg font-bold text-center mb-1">Livong Admin</h1>
        <p className="text-xs text-text-muted text-center mb-6">Login with your admin phone number</p>

        {step === "phone" ? (
          <>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => e.key === "Enter" && phone.length === 10 && sendOTP()}
              placeholder="10-digit phone number"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent"
            />
            <button
              onClick={sendOTP}
              disabled={phone.length !== 10}
              className="btn btn-accent w-full justify-center mt-3 py-2.5 disabled:opacity-40"
            >
              Send OTP
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-text-secondary mb-3 text-center">OTP sent to {phone}</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && otp.length >= 4 && verifyOTP()}
              placeholder="Enter OTP"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent"
            />
            <button
              onClick={verifyOTP}
              disabled={otp.length < 4}
              className="btn btn-accent w-full justify-center mt-3 py-2.5 disabled:opacity-40"
            >
              Verify & Login
            </button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full text-xs text-text-muted text-center mt-3 hover:text-text-secondary"
            >
              ← Change number
            </button>
          </>
        )}

        {error && <p className="text-xs text-error mt-2 text-center">{error}</p>}
      </div>
    </div>
  );
}
