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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 lg:px-12 pt-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">Livong</h2>
        <Link
          href="/login"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-4 py-2 border border-neutral-200 rounded-lg hover:border-neutral-300"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 text-center lg:text-left lg:flex-row lg:gap-20 max-w-6xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-neutral-600">
              Smart roommate matching
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-4 text-neutral-900">
            Find your
            <br />
            perfect roommate
          </h1>

          <p className="text-base lg:text-lg text-neutral-500 max-w-xs lg:max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white"
            >
              <span>{f.icon}</span>
              <span className="text-xs font-medium text-neutral-600">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="pb-8 text-center">
        <p className="text-xs text-neutral-400">
          Trusted by people across India
        </p>
      </div>
    </div>
  );
}
