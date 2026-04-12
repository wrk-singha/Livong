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
};

const CARDS = [
  { key: "totalUsers", label: "Users", color: "text-accent" },
  { key: "totalProfiles", label: "Profiles", color: "text-info" },
  { key: "totalListings", label: "Listings", color: "text-success" },
  { key: "totalInterests", label: "Interests", color: "text-warning" },
  { key: "totalMatches", label: "Matches", color: "text-accent" },
  { key: "totalMessages", label: "Messages", color: "text-info" },
  { key: "totalReviews", label: "Reviews", color: "text-success" },
  { key: "totalImages", label: "Images", color: "text-warning" },
  { key: "verifiedUsers", label: "Verified Users", color: "text-accent" },
  { key: "paidUsers", label: "Paid Users", color: "text-success" },
  { key: "recentSignups", label: "Signups (7d)", color: "text-info" },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    admin.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <Shell>
      <h2 className="text-lg font-bold mb-4">Dashboard</h2>
      {!stats ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CARDS.map((card) => (
            <div key={card.key} className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider font-medium mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{stats[card.key]}</p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
