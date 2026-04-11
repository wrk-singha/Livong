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
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-40 flex-col glass border-r border-white/40">
          {/* Brand */}
          <div className="px-6 pt-8 pb-6">
            <h1 className="text-2xl font-bold gradient-text">Livong</h1>
            <p className="text-[11px] text-slate-400 mt-1">Find your perfect roommate</p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    active
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <item.Icon active={active} />
                  <span className={`text-sm font-medium ${active ? "text-indigo-600" : ""}`}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 pb-3">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
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
          showNav && !isChat ? "pb-20 lg:pb-0 lg:pl-64" : showNav ? "lg:pl-64" : ""
        }`}
      >
        {children}
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      {showNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/40">
          <div className="max-w-md mx-auto flex justify-around py-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${
                    active
                      ? "text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <div className={`mb-0.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}>
                    <item.Icon active={active} />
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-indigo-600" : ""}`}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
