const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed`, res.status);
  }

  return res.json();
}

// Auth
export const api = {
  login: (phone: string) =>
    request<{ message: string; otp: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ userId: string; token: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  // Profile
  getProfile: () =>
    request<{
      id: string;
      name: string;
      age: number;
      gender: string;
      budgetMin: number;
      budgetMax: number;
      location: string;
      smoking?: string;
      drinking?: string;
      cleanliness?: string;
      sleepSchedule?: string;
      workSchedule?: string;
      pets?: string;
      foodPreference?: string;
    }>("/profile"),

  createProfile: (data: {
    name: string;
    age: number;
    gender: string;
    budgetMin: number;
    budgetMax: number;
    location: string;
  }) =>
    request<{ id: string }>("/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProfile: (data: Record<string, string>) =>
    request<{ message: string }>("/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Listings
  getListings: (params?: {
    location?: string;
    minBudget?: string;
    maxBudget?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.location) search.set("location", params.location);
    if (params?.minBudget) search.set("minBudget", params.minBudget);
    if (params?.maxBudget) search.set("maxBudget", params.maxBudget);
    const qs = search.toString();
    return request<
      {
        id: string;
        userId: string;
        title: string;
        description: string;
        rent: number;
        location: string;
        propertyType: string;
      }[]
    >(`/listings${qs ? `?${qs}` : ""}`);
  },

  getListing: (id: string) =>
    request<{
      id: string;
      userId: string;
      title: string;
      description: string;
      rent: number;
      location: string;
      propertyType: string;
    }>(`/listings/${id}`),

  createListing: (data: {
    title: string;
    description?: string;
    rent: number;
    location: string;
    propertyType: string;
  }) =>
    request<{ id: string }>("/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Interests
  sendInterest: (receiverId: string, listingId: string) =>
    request<{ id: string }>("/interests", {
      method: "POST",
      body: JSON.stringify({ receiverId, listingId }),
    }),

  updateInterest: (id: string, status: "accepted" | "rejected") =>
    request<{ message: string }>(`/interests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Matches
  getMatches: () =>
    request<
      {
        matchId: string;
        listingId: string;
        user: { id: string; name: string };
      }[]
    >("/matches"),

  // Messages
  getMessages: (matchId: string) =>
    request<
      { id: string; senderId: string; message: string; messageType: string; createdAt: string }[]
    >(`/messages/${matchId}`),

  sendMessage: (matchId: string, message: string) =>
    request<{ id: string }>("/messages", {
      method: "POST",
      body: JSON.stringify({ matchId, message }),
    }),

  shareContact: (matchId: string, contactType: "phone" | "email", contactValue: string) =>
    request<{ id: string; messageType: string }>("/messages/share-contact", {
      method: "POST",
      body: JSON.stringify({ matchId, contactType, contactValue }),
    }),
};
