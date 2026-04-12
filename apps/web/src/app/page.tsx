"use client";

import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { isAuthenticated, hydrated } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace("/explore");
    }
  }, [hydrated, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 lg:px-12 pt-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Livong</h2>
        <div className="flex items-center gap-2">
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
          <Link
            href="/login"
            className="text-sm font-medium text-secondary hover:text-foreground transition-colors px-4 py-2 border border-border rounded-lg hover:border-muted"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 text-center lg:text-left lg:flex-row lg:gap-20 max-w-6xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-alt rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-secondary">
              Smart roommate matching
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-4 text-foreground">
            Find your
            <br />
            perfect roommate
          </h1>

          <p className="text-base lg:text-lg text-muted max-w-xs lg:max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
            The smarter way to find compatible people to share a home with.
            Match on lifestyle, budget & location.
          </p>

          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-medium"
          >
            Get Started
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-12 lg:mt-0 lg:flex-1 flex flex-wrap justify-center lg:justify-start gap-2.5 stagger max-w-sm lg:max-w-md">
          {[
            { icon: "🏠", label: "Verified listings" },
            { icon: "💬", label: "In-app chat" },
            { icon: "🎯", label: "Lifestyle matching" },
            { icon: "🔒", label: "Safe & private" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface"
            >
              <span>{f.icon}</span>
              <span className="text-xs font-medium text-secondary">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="pb-8 text-center">
        <p className="text-xs text-dim">
          Trusted by people across India
        </p>
      </div>
    </div>
  );
}
