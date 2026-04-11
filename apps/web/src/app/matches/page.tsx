"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Match = {
  matchId: string;
  listingId: string;
  user: { id: string; name: string };
};

const GRADIENT_PAIRS = [
  "from-indigo-400 to-purple-400",
  "from-pink-400 to-rose-400",
  "from-emerald-400 to-teal-400",
  "from-amber-400 to-orange-400",
  "from-blue-400 to-cyan-400",
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMatches()
      .then((data) => setMatches(data || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-800">Matches</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-3">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="w-20 h-20 bg-linear-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium mb-1">No matches yet</p>
            <p className="text-xs text-slate-400 mb-4">
              Send interest on listings to get matched
            </p>
            <Link
              href="/explore"
              className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              Explore listings
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 stagger">
            {matches.map((match, i) => (
              <Link
                key={match.matchId}
                href={`/chat/${match.matchId}`}
                className="card flex items-center gap-4 p-4 group"
              >
                <div className={`w-12 h-12 bg-linear-to-br ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length]} rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm`}>
                  {match.user.name
                    ? match.user.name.charAt(0).toUpperCase()
                    : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {match.user.name || "User"}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Tap to start chatting
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <svg className="text-slate-300 group-hover:text-indigo-400 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
