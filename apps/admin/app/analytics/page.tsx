"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "../Shell";
import { admin } from "../lib/api";

type TimePoint = { date: string; count: number; amount?: number };
type Distribution = { plan?: string; status?: string; location?: string; count: number };
type Funnel = { users: number; profiles: number; listings: number; interests: number; matches: number };

type Analytics = {
  signupsByDay: TimePoint[] | null;
  listingsByDay: TimePoint[] | null;
  matchesByDay: TimePoint[] | null;
  revenueByDay: TimePoint[] | null;
  messagesByDay: TimePoint[] | null;
  funnel: Funnel;
  planDistribution: Distribution[] | null;
  interestsByStatus: Distribution[] | null;
  topLocations: Distribution[] | null;
  avgRating: number;
  avgMessagesPerMatch: number;
};

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function fmtMoney(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ── SVG Line Chart with area fill ──

function LineChart({ data, valueKey = "count", label, color }: {
  data: TimePoint[] | null;
  valueKey?: "count" | "amount";
  label: string;
  color: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data || data.length === 0) return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-xs font-semibold text-text-secondary mb-3">{label}</h4>
      <div className="h-32 flex items-center justify-center text-text-dim text-xs">No data yet</div>
    </div>
  );

  const values = data.map((d) => (d as any)[valueKey] || 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const W = 400;
  const H = 120;
  const PAD = { top: 8, bottom: 4, left: 0, right: 0 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => {
    const x = PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const val = (d as any)[valueKey] || 0;
    const y = PAD.top + chartH - (val / max) * chartH;
    return { x, y, val, date: d.date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PAD.top + chartH - frac * chartH,
    label: Math.round(frac * max),
  }));

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs font-semibold text-text-secondary">{label}</h4>
        <span className="text-[10px] text-text-dim">
          Total: {valueKey === "amount" ? fmtMoney(total) : total.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
          {gridLines.map((g, i) => (
            <line key={i} x1={PAD.left} x2={W - PAD.right} y1={g.y} y2={g.y}
              stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="3,3" />
          ))}
          <path d={areaPath} fill={color} opacity="0.12" />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 4 : 2.5}
              fill={color} stroke="var(--surface)" strokeWidth="1.5"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHovered(i)} />
          ))}
        </svg>
        {hovered !== null && points[hovered] && (
          <div
            className="absolute -top-1 bg-bg border border-border rounded px-2 py-1 text-[10px] text-text whitespace-nowrap z-10 pointer-events-none"
            style={{ left: `${(points[hovered].x / W) * 100}%`, transform: "translateX(-50%)" }}
          >
            <span className="font-medium">{valueKey === "amount" ? fmtMoney(points[hovered].val) : points[hovered].val}</span>
            <span className="text-text-dim ml-1">· {fmtDate(points[hovered].date)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-text-dim">{fmtDate(data[0].date)}</span>
        <span className="text-[8px] text-text-dim">{fmtDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: Funnel }) {
  const steps = [
    { label: "Users", value: funnel.users, color: "bg-accent" },
    { label: "Profiles", value: funnel.profiles, color: "bg-info" },
    { label: "Listings", value: funnel.listings, color: "bg-success" },
    { label: "Interests", value: funnel.interests, color: "bg-warning" },
    { label: "Matches", value: funnel.matches, color: "bg-accent" },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-xs font-semibold text-text-secondary mb-4">Conversion Funnel</h4>
      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const pct = (step.value / max) * 100;
          const convRate = i > 0 && steps[i - 1].value > 0
            ? ((step.value / steps[i - 1].value) * 100).toFixed(0)
            : null;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-text-muted">{step.label}</span>
                <span className="text-[10px] text-text-secondary font-medium">
                  {step.value.toLocaleString("en-IN")}
                  {convRate && <span className="text-text-dim ml-1">({convRate}%)</span>}
                </span>
              </div>
              <div className="h-5 bg-surface-alt rounded-md overflow-hidden">
                <div
                  className={`h-full ${step.color} rounded-md transition-all`}
                  style={{ width: `${Math.max(pct, 2)}%`, opacity: 0.8 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ data, labelKey, title }: {
  data: Distribution[] | null;
  labelKey: "plan" | "status" | "location";
  title: string;
}) {
  if (!data || data.length === 0) return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-xs font-semibold text-text-secondary mb-3">{title}</h4>
      <div className="h-28 flex items-center justify-center text-text-dim text-xs">No data</div>
    </div>
  );

  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = ["#6366f1", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

  // Build conic gradient stops
  let cumPct = 0;
  const stops = data.map((d, i) => {
    const pct = (d.count / total) * 100;
    const start = cumPct;
    cumPct += pct;
    return `${colors[i % colors.length]} ${start}% ${cumPct}%`;
  }).join(", ");

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-xs font-semibold text-text-secondary mb-3">{title}</h4>
      <div className="flex items-center gap-4">
        <div
          className="w-24 h-24 rounded-full shrink-0"
          style={{
            background: `conic-gradient(${stops})`,
            maskImage: "radial-gradient(circle, transparent 38%, black 40%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 38%, black 40%)",
          }}
        />
        <div className="space-y-1.5 flex-1">
          {data.map((d, i) => {
            const pct = ((d.count / total) * 100).toFixed(0);
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                <span className="text-text-muted capitalize flex-1 truncate">{(d as any)[labelKey] || "—"}</span>
                <span className="text-text-secondary font-medium">{d.count}</span>
                <span className="text-text-dim">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HBarChart({ data, labelKey, title }: {
  data: Distribution[] | null;
  labelKey: string;
  title: string;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-xs font-semibold text-text-secondary mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          return (
            <div key={i}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-text-muted truncate max-w-[70%]">{(d as any)[labelKey] || "Unknown"}</span>
                <span className="text-text-secondary font-medium">{d.count}</span>
              </div>
              <div className="h-3 bg-surface-alt rounded overflow-hidden">
                <div className="h-full bg-accent/70 rounded transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-accent">{value}</p>
      {sub && <p className="text-[10px] text-text-dim mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<number | null>(30);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback((opts?: { days?: number; from?: string; to?: string }) => {
    setLoading(true);
    admin.getAnalytics(opts)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load({ days: 30 }); }, [load]);

  const selectPreset = (days: number) => {
    setActivePreset(days);
    setFrom("");
    setTo("");
    load({ days });
  };

  const applyRange = () => {
    if (!from) return;
    setActivePreset(null);
    load({ from, to: to || toInputDate(new Date()) });
  };

  const LINE_COLORS = {
    signups: "#6366f1",
    listings: "#10b981",
    matches: "#06b6d4",
    messages: "#8b5cf6",
    revenue: "#22c55e",
  };

  return (
    <Shell>
      {/* Header + controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold">Analytics</h2>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => selectPreset(p.days)}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                activePreset === p.days
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-text-muted hover:text-text hover:border-accent"
              }`}
            >
              {p.label}
            </button>
          ))}

          <span className="text-text-dim text-[10px] mx-1">or</span>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-surface-alt border border-border rounded px-2 py-1 text-[10px] text-text-secondary"
          />
          <span className="text-text-dim text-[10px]">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            max={toInputDate(new Date())}
            className="bg-surface-alt border border-border rounded px-2 py-1 text-[10px] text-text-secondary"
          />
          <button
            onClick={applyRange}
            disabled={!from}
            className="text-[10px] px-3 py-1 rounded border border-accent text-accent bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : data ? (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Avg Rating" value={data.avgRating ? `${data.avgRating.toFixed(1)} ★` : "—"} sub="Across all reviews" />
            <MetricCard label="Avg Messages / Match" value={data.avgMessagesPerMatch ? data.avgMessagesPerMatch.toFixed(1) : "0"} sub="Engagement depth" />
            <MetricCard
              label="Profile Completion"
              value={data.funnel.users > 0 ? `${((data.funnel.profiles / data.funnel.users) * 100).toFixed(0)}%` : "—"}
              sub={`${data.funnel.profiles} of ${data.funnel.users} users`}
            />
            <MetricCard
              label="Match Rate"
              value={data.funnel.interests > 0 ? `${((data.funnel.matches / data.funnel.interests) * 100).toFixed(0)}%` : "—"}
              sub={`${data.funnel.matches} matches from ${data.funnel.interests} interests`}
            />
          </div>

          {/* Line charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LineChart data={data.signupsByDay} label="User Signups" color={LINE_COLORS.signups} />
            <LineChart data={data.listingsByDay} label="Listings Created" color={LINE_COLORS.listings} />
            <LineChart data={data.matchesByDay} label="Matches" color={LINE_COLORS.matches} />
            <LineChart data={data.messagesByDay} label="Messages Sent" color={LINE_COLORS.messages} />
            <LineChart data={data.revenueByDay} valueKey="amount" label="Revenue" color={LINE_COLORS.revenue} />
          </div>

          {/* Funnel + distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FunnelChart funnel={data.funnel} />
            <DonutChart data={data.planDistribution} labelKey="plan" title="Plan Distribution" />
            <DonutChart data={data.interestsByStatus} labelKey="status" title="Interests by Status" />
            <HBarChart data={data.topLocations} labelKey="location" title="Top Listing Locations" />
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
