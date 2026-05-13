// Defaults to admin backend (6981), NOT main backend (6980). The admin web
// only talks to admin-backend; CSP in next.config.ts allows only :6981.
// Override with NEXT_PUBLIC_API_URL when deploying.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6981";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("admin_token") || "";
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("admin_token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const admin = {
  setToken: (token: string) => localStorage.setItem("admin_token", token),
  hasToken: () => !!localStorage.getItem("admin_token"),
  logout: () => { localStorage.removeItem("admin_token"); window.location.href = "/"; },

  // Auth (uses public endpoints)
  sendOTP: (phone: string) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),

  verifyOTP: (phone: string, otp: string) =>
    fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),

  // Admin endpoints
  getStats: (days?: number) => request(`/admin/stats${days ? `?days=${days}` : ""}`),
  getUsers: (page = 1, limit = 50) => request(`/admin/users?page=${page}&limit=${limit}`),
  updateUser: (id: string, data: { verified?: boolean; plan?: string }) =>
    request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request(`/admin/users/${id}`, { method: "DELETE" }),
  getListings: (page = 1, limit = 50) => request(`/admin/listings?page=${page}&limit=${limit}`),
  deleteListing: (id: string) =>
    request(`/admin/listings/${id}`, { method: "DELETE" }),
  getReviews: (page = 1, limit = 50) => request(`/admin/reviews?page=${page}&limit=${limit}`),
  deleteReview: (id: string) =>
    request(`/admin/reviews/${id}`, { method: "DELETE" }),
  getMatches: (page = 1, limit = 50) => request(`/admin/matches?page=${page}&limit=${limit}`),
  getInterests: (page = 1, limit = 50) => request(`/admin/interests?page=${page}&limit=${limit}`),
  getRevenue: (from?: string, to?: string, interval?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (interval) params.set("interval", interval);
    const q = params.toString();
    return request(`/admin/revenue${q ? `?${q}` : ""}`);
  },
  getAnalytics: (opts?: { days?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (!opts?.from) params.set("days", String(opts?.days ?? 30));
    const q = params.toString();
    return request(`/admin/analytics${q ? `?${q}` : ""}`);
  },
  getReports: (status: "pending" | "reviewed" | "dismissed" | "actioned" | "all" = "pending", page = 1, limit = 50) =>
    request(`/admin/reports?status=${status}&page=${page}&limit=${limit}`),
  updateReport: (id: string, status: "dismissed" | "actioned" | "reviewed") =>
    request(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
