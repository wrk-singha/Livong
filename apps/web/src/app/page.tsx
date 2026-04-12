"use client";

import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Lifestyle Matching",
    desc: "Match based on sleep schedule, cleanliness, food preferences, work habits and more — not just budget.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Verified Listings",
    desc: "Browse rooms, flats, and shared spaces with clear details on rent, location, and property type.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "In-App Chat",
    desc: "Chat directly with your matches. Share contact info securely when you're ready — no external apps needed.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Safe & Private",
    desc: "Your contact details stay hidden until you choose to share them. No spam, no strangers — only verified matches.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Interest System",
    desc: "Show interest on listings and get matched when it's mutual. No awkward cold messages — both sides agree first.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Works Everywhere",
    desc: "Installable as an app on your phone. Responsive design that works beautifully on desktop, tablet, and mobile.",
  },
];

const STEPS = [
  { num: "01", title: "Create your profile", desc: "Sign up with your phone number. Set your budget, location, and lifestyle preferences." },
  { num: "02", title: "Explore listings", desc: "Browse rooms, flats, and shared spaces. Filter by location and budget to find what fits." },
  { num: "03", title: "Send interest", desc: "Like a listing? Send interest to the poster. They'll review your profile and decide." },
  { num: "04", title: "Match & chat", desc: "When interest is mutual, you're matched! Chat in-app and share contact info when ready." },
];

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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="gradient-orb w-96 h-96 -top-48 -right-48 bg-accent" />
      <div className="gradient-orb w-72 h-72 top-1/2 -left-36 bg-accent-secondary" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-6 lg:px-12 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
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
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 lg:px-12 pt-20 pb-24 lg:pt-28 lg:pb-32 text-center max-w-6xl mx-auto w-full">
        {/* Hero background glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />
        </div>
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-surface border border-accent/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-dot" />
            <span className="text-xs font-medium text-accent">
              For working professionals in India
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5">
            <span className="text-foreground">Find the right place</span>
            <br />
            <span className="text-foreground">and the right </span>
            <span className="gradient-text">people to live with</span>
          </h1>

          <p className="text-base lg:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Stop juggling WhatsApp groups & random listings. Livong matches you with
            compatible roommates based on lifestyle, budget & location — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="btn-accent inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium"
            >
              Get Started — it&apos;s free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-xl text-sm font-medium text-secondary hover:text-foreground transition-colors"
            >
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto">
          {[
            { value: "100%", label: "Free to use" },
            { value: "7+", label: "Lifestyle filters" },
            { value: "Instant", label: "Match & chat" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-dim mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem section */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 bg-surface-alt relative overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Finding a roommate shouldn&apos;t be this hard
          </h2>
          <p className="text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            You&apos;re scrolling through dozens of groups, texting strangers, visiting sketchy listings,
            and still ending up with someone whose lifestyle is completely different from yours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto stagger">
            {[
              { emoji: "😩", text: "Scattered across WhatsApp, Facebook & Housing" },
              { emoji: "🤷", text: "No way to know if you're actually compatible" },
              { emoji: "⏰", text: "Weeks of searching with no real results" },
            ].map((p) => (
              <div key={p.text} className="card p-5 text-center hover:border-accent/20">
                <span className="text-2xl mb-3 block">{p.emoji}</span>
                <p className="text-sm text-secondary leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 section-glow relative overflow-hidden">
        <div className="absolute -top-20 -right-32 w-72 h-72 rounded-full bg-accent/6 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-32 w-60 h-60 rounded-full bg-accent-secondary/6 blur-[80px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-surface border border-accent/20 rounded-full mb-4">
              <span className="text-xs font-medium text-accent">Features</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-muted max-w-lg mx-auto">
              Built for people who want a simple, safe way to find the right person to share a home with.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5 group hover:border-accent/20">
                <div className="w-10 h-10 rounded-lg bg-accent-surface flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 lg:px-12 py-16 lg:py-20 bg-surface-alt scroll-mt-16 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-surface border border-accent/20 rounded-full mb-4">
              <span className="text-xs font-medium text-accent">How it works</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Four steps to your new home
            </h2>
            <p className="text-muted max-w-lg mx-auto">
              From sign-up to moving in — the whole process is simple and transparent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
            {STEPS.map((s) => (
              <div key={s.num} className="card p-6 flex gap-4 hover:border-accent/20">
                <span className="text-2xl font-bold gradient-text shrink-0 leading-none mt-0.5">{s.num}</span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 section-glow-bottom relative overflow-hidden">
        <div className="absolute top-10 right-0 w-48 h-48 rounded-full bg-accent-secondary/6 blur-[60px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Built for people like you
          </h2>
          <p className="text-muted max-w-lg mx-auto mb-10">
            Whether you&apos;re relocating for work or just need a new place — Livong is for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
            {[
              { emoji: "💼", title: "Working professionals", desc: "Ages 22–35, moving to or within cities for work" },
              { emoji: "🚀", title: "City newcomers", desc: "Relocating to Bangalore or other metros and need a trusted start" },
              { emoji: "🏠", title: "Room/flat owners", desc: "Have a spare room or flat? List it and find a compatible tenant" },
            ].map((t) => (
              <div key={t.title} className="card p-5 text-center hover:border-accent/20">
                <span className="text-2xl mb-3 block">{t.emoji}</span>
                <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 bg-surface-alt relative overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-accent/8 blur-[80px] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Ready to find your perfect roommate?
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Join Livong today. Create a profile in under a minute and start exploring listings near you.
          </p>
          <Link
            href="/login"
            className="btn-accent inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium"
          >
            Get Started — it&apos;s free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Livong</span>
            <span className="text-xs text-dim">· Find the right people to live with</span>
          </div>
          <p className="text-xs text-dim">
            Made in India
          </p>
        </div>
      </footer>
    </div>
  );
}
