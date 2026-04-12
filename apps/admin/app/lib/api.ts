const API_BASE = "http://localhost:8080";

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
  getStats: () => request("/admin/stats"),
  getUsers: () => request("/admin/users"),
  updateUser: (id: string, data: { verified?: boolean; plan?: string }) =>
    request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request(`/admin/users/${id}`, { method: "DELETE" }),
  getListings: () => request("/admin/listings"),
  deleteListing: (id: string) =>
    request(`/admin/listings/${id}`, { method: "DELETE" }),
  getReviews: () => request("/admin/reviews"),
  deleteReview: (id: string) =>
    request(`/admin/reviews/${id}`, { method: "DELETE" }),
  getMatches: () => request("/admin/matches"),
  getInterests: () => request("/admin/interests"),
};
