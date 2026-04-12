"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
import { admin } from "../lib/api";

type Stats = {
  totalUsers: number;
  totalProfiles: number;
  totalListings: number;
  totalInterests: number;
  totalMatches: number;
  totalMessages: number;
  totalReviews: number;
  totalImages: number;
  verifiedUsers: number;
  paidUsers: number;
  recentSignups: number;
  totalRevenue: number;
  monthRevenue: number;
};

const CARDS = [
  { key: "totalRevenue", label: "Revenue", color: "text-success", fmt: "money" },
  { key: "paidUsers", label: "Paid Users", color: "text-success" },
  { key: "totalUsers", label: "Users", color: "text-accent" },
  { key: "totalProfiles", label: "Profiles", color: "text-info" },
  { key: "totalListings", label: "Listings", color: "text-success" },
  { key: "totalInterests", label: "Interests", color: "text-warning" },
  { key: "totalMatches", label: "Matches", color: "text-accent" },
  { key: "totalMessages", label: "Messages", color: "text-info" },
  { key: "totalReviews", label: "Reviews", color: "text-success" },
  { key: "totalImages", label: "Images", color: "text-warning" },
  { key: "verifiedUsers", label: "Verified Users", color: "text-accent" },
  { key: "recentSignups", label: "Signups (7d)", color: "text-info" },
] as const;

const DAY_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "All time", value: 0 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(0);

  const load = (d: number) => {
    admin.getStats(d || undefined).then(setStats).catch(() => {});
  };

  useEffect(() => { load(0); }, []);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Dashboard</h2>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setDays(opt.value); load(opt.value); }}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                days === opt.value
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-text-muted hover:text-text hover:border-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {!stats ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CARDS.map((card) => (
            <div key={card.key} className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider font-medium mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>
                {"fmt" in card && card.fmt === "money" ? `₹${(stats[card.key] || 0).toLocaleString("en-IN")}` : stats[card.key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
