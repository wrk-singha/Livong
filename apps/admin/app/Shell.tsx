"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { admin } from "./lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/analytics", label: "Analytics", icon: "◊" },
  { href: "/revenue", label: "Revenue", icon: "₹" },
  { href: "/users", label: "Users", icon: "◉" },
  { href: "/listings", label: "Listings", icon: "⊞" },
  { href: "/reviews", label: "Reviews", icon: "★" },
  { href: "/matches", label: "Matches", icon: "⊕" },
  { href: "/interests", label: "Interests", icon: "♡" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="w-52 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-sm font-bold text-accent">Livong Admin</h1>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                pathname === item.href
                  ? "text-accent bg-accent/10"
                  : "text-text-muted hover:text-text hover:bg-surface-alt"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => admin.logout()}
            className="w-full text-left px-3 py-1.5 text-xs text-text-dim hover:text-error transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
