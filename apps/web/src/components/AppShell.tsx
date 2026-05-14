"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { useFlags, FLAG_KEYS } from "@/contexts/flags";

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "opacity-100" : "opacity-50"}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MatchesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "opacity-100" : "opacity-50"}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PostIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "opacity-100" : "opacity-50"}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function RentIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "opacity-100" : "opacity-50"}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 12h.01" />
      <path d="M17 12h.01" />
      <path d="M7 12h.01" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "opacity-100" : "opacity-50"}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// Labels are intentionally short to fit the mobile bottom nav (10px font, 5 items).
// `tip` is shown as a hover tooltip on the desktop sidebar — first-time users
// often can't tell what "Rent" or "List" do without context.
const navItems = [
  { href: "/explore", label: "Explore", Icon: ExploreIcon, tip: "Browse rooms and roommates" },
  { href: "/matches", label: "Matches", Icon: MatchesIcon, tip: "People who matched with you" },
  { href: "/create-listing", label: "List", Icon: PostIcon, tip: "List a room you have to share" },
  { href: "/rent", label: "Rent", Icon: RentIcon, tip: "Track rent splits with current roommates" },
  { href: "/profile", label: "Profile", Icon: ProfileIcon, tip: "Edit your profile and preferences" },
];

const PUBLIC_PATHS = ["/", "/login", "/plans", "/privacy", "/terms"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, hydrated, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { isEnabled } = useFlags();

  // Filter nav items by feature flags so admin-disabled features just
  // disappear from the menu (vs. linking to a 503'd endpoint).
  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/create-listing") return isEnabled(FLAG_KEYS.CREATE_LISTING);
    if (item.href === "/rent") return isEnabled(FLAG_KEYS.RENT);
    return true;
  });

  // Hide chrome on chat (full-screen conversation) AND on /profile/setup
  // (no nav to dodge during onboarding — user must complete the form first).
  const isChat = pathname.startsWith("/chat/");
  const isOnboarding = pathname === "/profile/setup";
  const showNav = hydrated && isAuthenticated && !isOnboarding;
  const needsRedirect = hydrated && !isAuthenticated && !PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (needsRedirect) router.replace("/");
  }, [needsRedirect, router]);

  if (!hydrated || needsRedirect) return null;

  return (
    <>
      {/* Desktop sidebar */}
      {showNav && (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 z-40 flex-col bg-surface border-r border-border">
          {/* Brand + theme toggle */}
          <div className="px-5 pt-7 pb-5 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Livong</h1>
              <p className="text-[11px] text-dim mt-0.5">Find your perfect roommate</p>
            </div>
            <button
              onClick={toggle}
              className="mt-0.5 p-2 rounded-lg text-dim hover:text-secondary hover:bg-surface-alt transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-0.5">
            {visibleNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.tip}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface-alt hover:text-secondary"
                  }`}
                >
                  <item.Icon active={active} />
                  <span className={`text-sm font-medium ${active ? "text-accent" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions — divider above so Plans/Logout don't visually
              run into the main nav. */}
          <div className="px-3 pt-3 pb-4 mt-2 space-y-1 border-t border-border-light">
            <Link
              href="/plans"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                pathname === "/plans"
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-alt hover:text-secondary"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={pathname === "/plans" ? "opacity-100" : "opacity-50"}>
                <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
              </svg>
              <span className="text-sm font-medium">Plans</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-dim hover:bg-error-surface hover:text-red-500 transition-colors"
            >
              <LogoutIcon />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile top bar */}
      {showNav && !isChat && (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border px-4 py-3 flex items-center justify-between pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <h1 className="text-base font-semibold text-foreground tracking-tight">Livong</h1>
          <button
            onClick={toggle}
            className="p-2 -mr-2 rounded-lg text-dim hover:text-secondary hover:bg-surface-alt transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
      )}

      {/* Main content area */}
      <main
        className={`flex-1 ${
          showNav && !isChat
            ? "pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+4rem)] lg:pt-0 lg:pb-0 lg:pl-60"
            : showNav && isChat
              ? "lg:pl-60"
              : ""
        }`}
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      {showNav && !isChat && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto flex justify-around py-1">
            {visibleNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.tip}
                  className={`flex flex-col items-center py-2 px-4 transition-all ${
                    active
                      ? "text-accent"
                      : "text-dim hover:text-secondary"
                  }`}
                >
                  <div className="mb-0.5">
                    <item.Icon active={active} />
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-accent" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

          </div>
        </nav>
      )}
    </>
  );
}
