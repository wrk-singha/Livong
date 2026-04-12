"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui";

type Match = {
  matchId: string;
  listingId: string;
  user: { id: string; name: string };
};

const AVATAR_COLORS = [
  "bg-accent",
  "bg-accent-secondary",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-purple-600",
];

export default function MatchesPage() {
  const { data: matches = [], isLoading: loading } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => (await api.getMatches()) || [],
  });

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-foreground">Matches</h1>
          <p className="text-xs text-dim mt-0.5">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg animate-shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded-md animate-shimmer" />
                  <div className="h-3 w-32 rounded-md animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="No matches yet"
            subtitle="Send interest on listings to get matched"
            action={
              <Link
                href="/explore"
                className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                Explore listings
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {matches.map((match, i) => (
              <Link
                key={match.matchId}
                href={`/chat/${match.matchId}`}
                className="card flex items-center gap-3 p-4 group"
              >
                <div className={`w-10 h-10 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-lg flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                  {match.user.name
                    ? match.user.name.charAt(0).toUpperCase()
                    : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground">
                    {match.user.name || "User"}
                  </h3>
                  <p className="text-xs text-dim truncate">
                    Tap to start chatting
                  </p>
                </div>
                <svg className="text-faint group-hover:text-muted transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
