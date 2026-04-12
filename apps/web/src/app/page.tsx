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

const FEATURE_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-purple-500 to-fuchsia-600",
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

      {/* Hero — Split layout */}
      <section className="relative px-6 lg:px-12 pt-16 pb-20 lg:pt-24 lg:pb-32 max-w-6xl mx-auto w-full">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 left-1/4 w-[700px] h-[700px] rounded-full bg-accent/6 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent-secondary/6 blur-[120px]" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-surface border border-accent/20 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-dot" />
              <span className="text-xs font-medium text-accent">For working professionals in India</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight mb-5">
              <span className="text-foreground">Find the right</span>
              <br />
              <span className="gradient-text">people to live with</span>
            </h1>

            <p className="text-base lg:text-lg text-muted max-w-lg mb-8 leading-relaxed">
              Stop juggling WhatsApp groups & random listings. Livong matches you with
              compatible roommates based on lifestyle, budget & location.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3">
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

            {/* Stats */}
            <div className="mt-12 flex items-center gap-6 pt-6 border-t border-border/50">
              {[
                { value: "100%", label: "Free to use" },
                { value: "7+", label: "Lifestyle filters" },
                { value: "Instant", label: "Match & chat" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <div className="w-px h-8 bg-border" />}
                  <div>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-dim mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Floating app preview cards */}
          <div className="relative hidden lg:flex items-center justify-center min-h-[480px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 rounded-full bg-accent/10 blur-[80px]" />
            </div>

            {/* Listing card */}
            <div className="absolute top-4 left-4 w-64 bg-surface/80 backdrop-blur-xl rounded-2xl p-5 float-slow shadow-xl border border-border/50 z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">R</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Rahul&apos;s 2BHK</p>
                  <p className="text-xs text-dim">Koramangala, Bangalore</p>
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 bg-accent-surface text-accent rounded-full font-medium">₹12,000/mo</span>
                <span className="text-xs px-2 py-0.5 bg-surface-alt text-muted rounded-full">2 BHK</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-dim">
                <div className="flex -space-x-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-surface" />
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-surface" />
                </div>
                2 interested
              </div>
            </div>

            {/* Match notification */}
            <div className="absolute top-0 right-4 w-52 bg-surface/80 backdrop-blur-xl rounded-2xl p-4 float-slow-reverse shadow-xl border border-border/50 z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-accent">New Match!</span>
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse-dot" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">P</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Priya M.</p>
                  <p className="text-xs text-success-text font-medium">92% compatible</p>
                </div>
              </div>
            </div>

            {/* Chat preview */}
            <div className="absolute bottom-12 right-0 w-56 bg-surface/80 backdrop-blur-xl rounded-2xl p-4 float-slow shadow-xl border border-border/50 z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                <span className="text-xs font-semibold text-foreground">Ankit</span>
                <div className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  <span className="text-[10px] text-dim">online</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-surface-alt rounded-lg py-1.5 px-2.5 text-xs text-secondary w-fit max-w-[85%]">Hey! Is the room still available?</div>
                <div className="bg-accent/10 rounded-lg py-1.5 px-2.5 text-xs text-accent ml-auto w-fit">Yes! When can you visit? 🏠</div>
              </div>
            </div>

            {/* Lifestyle pill */}
            <div className="absolute bottom-0 left-8 bg-surface/80 backdrop-blur-xl rounded-xl px-4 py-3 float-slow-reverse shadow-lg border border-border/50 z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🌙</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Night Owl</p>
                  <p className="text-[10px] text-dim">Sleeps after midnight</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile preview strip */}
        <div className="lg:hidden mt-12 grid grid-cols-3 gap-3 stagger">
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-3 border border-border/50 text-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">R</div>
            <p className="text-xs font-medium text-foreground">Browse listings</p>
            <p className="text-[10px] text-dim">With filters</p>
          </div>
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-3 border border-border/50 text-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">P</div>
            <p className="text-xs font-medium text-foreground">Get matched</p>
            <p className="text-[10px] text-dim">92% compatible</p>
          </div>
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-3 border border-border/50 text-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">A</div>
            <p className="text-xs font-medium text-foreground">Chat in-app</p>
            <p className="text-[10px] text-dim">Secure & private</p>
          </div>
        </div>
      </section>

      {/* Problem — Before / After comparison */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-accent/6 via-transparent to-accent-secondary/6" />
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-secondary/8 blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Finding a roommate shouldn&apos;t be this hard
            </h2>
            <p className="text-muted max-w-2xl mx-auto leading-relaxed">
              The old way is scattered, slow, and risky. Livong brings it all into one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 stagger">
            <div className="card p-6 border-l-4 border-l-error/60">
              <p className="text-xs font-semibold text-error uppercase tracking-wider mb-4">Without Livong</p>
              <ul className="space-y-3">
                {[
                  "Scrolling WhatsApp groups & Facebook pages",
                  "No idea if your lifestyles actually match",
                  "Weeks of searching with no real results",
                  "Sharing your phone number with strangers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6 border-l-4 border-l-accent">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">With Livong</p>
              <ul className="space-y-3">
                {[
                  "One platform for rooms and roommates",
                  "Lifestyle-based compatibility matching",
                  "Find matches in minutes, not weeks",
                  "Share contact info only when you choose",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-secondary">
                    <svg className="w-4 h-4 text-accent shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-accent-secondary/6 via-transparent to-accent/6" />
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute -top-20 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-32 w-80 h-80 rounded-full bg-accent-secondary/10 blur-[120px] pointer-events-none" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="card p-6 group hover:border-accent/20">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${FEATURE_GRADIENTS[i]} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 lg:px-12 py-16 lg:py-20 scroll-mt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-accent-secondary/6" />
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[140px] pointer-events-none" />
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

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden sm:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-accent/20 via-accent/50 to-accent-secondary/20" />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-6">
              {STEPS.map((s) => (
                <div key={s.num} className="relative text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-secondary text-white text-sm font-bold flex items-center justify-center mx-auto mb-4 relative z-10 shadow-lg shadow-accent/20">
                    {s.num}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 lg:px-12 py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tl from-accent/6 via-transparent to-accent-secondary/8" />
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-10 right-0 w-72 h-72 rounded-full bg-accent-secondary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full bg-accent/8 blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Built for people like you
          </h2>
          <p className="text-muted max-w-lg mx-auto mb-10">
            Whether you&apos;re relocating for work or just need a new place — Livong is for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 stagger">
            {[
              { emoji: "💼", title: "Working professionals", desc: "Ages 22–35, moving to or within cities for work" },
              { emoji: "🚀", title: "City newcomers", desc: "Relocating to Bangalore or other metros and need a trusted start" },
              { emoji: "🏠", title: "Room/flat owners", desc: "Have a spare room or flat? List it and find a compatible tenant" },
            ].map((t) => (
              <div key={t.title} className="card p-6 text-center hover:border-accent/20">
                <div className="w-14 h-14 rounded-2xl bg-accent-surface flex items-center justify-center text-2xl mx-auto mb-4">
                  {t.emoji}
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{t.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-12 py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-accent-secondary/8" />
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ready to find your<br />
            <span className="gradient-text">perfect roommate?</span>
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto leading-relaxed">
            Join Livong today. Create a profile in under a minute and start exploring listings near you.
          </p>
          <Link
            href="/login"
            className="btn-accent inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-medium shadow-lg shadow-accent/20"
          >
            Get Started — it&apos;s free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
