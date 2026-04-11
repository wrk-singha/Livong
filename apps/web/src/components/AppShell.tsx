"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth";

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MatchesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PostIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const navItems = [
  { href: "/explore", label: "Explore", Icon: ExploreIcon },
  { href: "/matches", label: "Matches", Icon: MatchesIcon },
  { href: "/create-listing", label: "Post", Icon: PostIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, hydrated, logout } = useAuth();

  const showNav = hydrated && isAuthenticated;
  const isChat = pathname.startsWith("/chat/");

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      {showNav && (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 z-40 flex-col bg-white border-r border-neutral-200">
          {/* Brand */}
          <div className="px-5 pt-7 pb-5">
            <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Livong</h1>
            <p className="text-[11px] text-neutral-400 mt-0.5">Find your perfect roommate</p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                  }`}
                >
                  <item.Icon active={active} />
                  <span className={`text-sm font-medium ${active ? "text-neutral-900" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogoutIcon />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main content area */}
      <main
        className={`flex-1 ${
          showNav && !isChat ? "pb-16 lg:pb-0 lg:pl-60" : showNav ? "lg:pl-60" : ""
        }`}
      >
        {children}
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      {showNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200">
          <div className="max-w-md mx-auto flex justify-around py-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-4 transition-colors ${
                    active
                      ? "text-neutral-900"
                      : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  <div className="mb-0.5">
                    <item.Icon active={active} />
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-neutral-900" : ""}`}>
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
