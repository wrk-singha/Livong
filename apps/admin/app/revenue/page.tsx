"use client";

import { useEffect, useState } from "react";
import Shell from "../Shell";
import { admin } from "../lib/api";

type PlanBreakdown = { plan: string; count: number; amount: number };
type TimeEntry = { period: string; count: number; amount: number };
type Payment = { id: string; plan: string; amount: number; name?: string; phone: string; createdAt?: string };

type Revenue = {
  totalRevenue: number;
  totalPayments: number;
  rangeRevenue: number;
  rangePayments: number;
  byPlan: PlanBreakdown[] | null;
  timeSeries: TimeEntry[] | null;
  recentPayments: Payment[] | null;
};

const INTERVALS = ["day", "week", "month", "year"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "7 days", from: () => daysAgo(7), to: today },
  { label: "30 days", from: () => daysAgo(30), to: today },
  { label: "90 days", from: () => daysAgo(90), to: today },
  { label: "This year", from: () => `${new Date().getFullYear()}-01-01`, to: today },
  { label: "All time", from: () => "", to: () => "" },
];

export default function RevenuePage() {
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [interval, setInterval] = useState<string>("day");

  const load = (f?: string, t?: string, i?: string) => {
    const _f = f ?? from;
    const _t = t ?? to;
    const _i = i ?? interval;
    setLoading(true);
    admin.getRevenue(_f || undefined, _t || undefined, _i)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const applyPreset = (p: typeof PRESETS[number]) => {
    const f = p.from();
    const t = p.to();
    setFrom(f);
    setTo(t);
    load(f, t);
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtMoney = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const maxAmount = data?.timeSeries?.reduce((m, e) => Math.max(m, e.amount), 0) || 1;

  return (
    <Shell>
      <h2 className="text-lg font-bold mb-4">Revenue</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-surface border border-border rounded px-2 py-1.5 text-xs text-text" />
        </div>
        <div>
          <label className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-surface border border-border rounded px-2 py-1.5 text-xs text-text" />
        </div>
        <div>
          <label className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">Interval</label>
          <select value={interval} onChange={(e) => { setInterval(e.target.value); load(from, to, e.target.value); }}
            className="bg-surface border border-border rounded px-2 py-1.5 text-xs text-text">
            {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <button onClick={() => load()} className="btn btn-accent text-xs py-1.5">Apply</button>
        <div className="flex gap-1.5 ml-2">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-text hover:border-accent transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Loading...</p>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Total Revenue (all time)</p>
              <p className="text-2xl font-bold text-success">{fmtMoney(data.totalRevenue)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-accent">{data.totalPayments}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Range Revenue</p>
              <p className="text-2xl font-bold text-success">{fmtMoney(data.rangeRevenue)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Range Payments</p>
              <p className="text-2xl font-bold text-accent">{data.rangePayments}</p>
            </div>
          </div>

          {/* Plan breakdown */}
          {data.byPlan && data.byPlan.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary mb-2">Revenue by Plan</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.byPlan.map((p) => (
                  <div key={p.plan} className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                      <span className={`badge ${p.plan === "pro" ? "badge-accent" : p.plan === "basic" ? "badge-info" : "badge-neutral"} mr-1.5`}>
                        {p.plan}
                      </span>
                    </p>
                    <p className="text-xl font-bold text-success">{fmtMoney(p.amount)}</p>
                    <p className="text-[10px] text-text-dim mt-0.5">{p.count} payments</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart — simple bar chart */}
          {data.timeSeries && data.timeSeries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary mb-2">Revenue Over Time</h3>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-end gap-1 h-40">
                  {data.timeSeries.map((entry, idx) => {
                    const pct = maxAmount > 0 ? (entry.amount / maxAmount) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg border border-border rounded px-1.5 py-0.5 text-[9px] text-text whitespace-nowrap z-10">
                          {fmtMoney(entry.amount)} · {entry.count} txn
                        </div>
                        <div
                          className="w-full bg-accent/80 rounded-t transition-all hover:bg-accent"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        />
                        <span className="text-[8px] text-text-dim truncate max-w-full">
                          {new Date(entry.period).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent payments */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary mb-2">Recent Payments (last 50)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments && data.recentPayments.length > 0 ? (
                    data.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium text-text">{p.name || <span className="text-text-dim">—</span>}</td>
                        <td className="text-text-secondary">{p.phone}</td>
                        <td>
                          <span className={`badge ${p.plan === "pro" ? "badge-accent" : p.plan === "basic" ? "badge-info" : "badge-neutral"} capitalize`}>
                            {p.plan}
                          </span>
                        </td>
                        <td className="text-success font-medium">{fmtMoney(p.amount)}</td>
                        <td className="text-text-dim text-xs">{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center text-text-dim py-8">No payments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
