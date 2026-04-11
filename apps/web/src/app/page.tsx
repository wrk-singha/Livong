"use client";

import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { isAuthenticated, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace("/explore");
    }
  }, [hydrated, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-linear-to-br from-indigo-200 to-purple-200 rounded-full opacity-50 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-linear-to-br from-pink-200 to-indigo-200 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 right-10 w-72 h-72 bg-linear-to-br from-purple-200 to-pink-100 rounded-full opacity-40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 lg:px-12 pt-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <h2 className="text-xl lg:text-2xl font-bold gradient-text">Livong</h2>
        <Link
          href="/login"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors lg:px-5 lg:py-2 lg:bg-indigo-50 lg:rounded-xl lg:hover:bg-indigo-100"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-12 text-center lg:text-left lg:flex-row lg:gap-16 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-indigo-600">
              Smart roommate matching
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4">
            Find your
            <br />
            <span className="gradient-text">perfect roommate</span>
          </h1>

          <p className="text-base lg:text-lg text-slate-500 max-w-xs lg:max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
            The smarter way to find compatible people to share a home with.
            Match on lifestyle, budget & location.
          </p>

          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-semibold"
          >
            Get Started
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-12 lg:mt-0 lg:flex-1 flex flex-wrap justify-center lg:justify-start gap-3 stagger max-w-sm lg:max-w-md">
          {[
            { icon: "🏠", label: "Verified listings" },
            { icon: "💬", label: "In-app chat" },
            { icon: "🎯", label: "Lifestyle matching" },
            { icon: "🔒", label: "Safe & private" },
          ].map((f) => (
            <div
              key={f.label}
              className="glass flex items-center gap-2 px-4 py-2 rounded-xl border border-white/60 shadow-sm"
            >
              <span>{f.icon}</span>
              <span className="text-xs font-medium text-slate-600">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-xs text-slate-400">
          Trusted by people across India
        </p>
      </div>
    </div>
  );
}
