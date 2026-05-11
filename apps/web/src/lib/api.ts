const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:8080`
    : "http://localhost:8080");

export function imageUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// --- Interceptors ---

type RequestInterceptor = (endpoint: string, options: RequestInit) => RequestInit;
type ResponseInterceptor = (response: Response, endpoint: string) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiError, endpoint: string) => void;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

export const interceptors = {
  request: {
    use: (fn: RequestInterceptor) => {
      requestInterceptors.push(fn);
      return () => {
        const i = requestInterceptors.indexOf(fn);
        if (i !== -1) requestInterceptors.splice(i, 1);
      };
    },
  },
  response: {
    use: (fn: ResponseInterceptor) => {
      responseInterceptors.push(fn);
      return () => {
        const i = responseInterceptors.indexOf(fn);
        if (i !== -1) responseInterceptors.splice(i, 1);
      };
    },
  },
  error: {
    use: (fn: ErrorInterceptor) => {
      errorInterceptors.push(fn);
      return () => {
        const i = errorInterceptors.indexOf(fn);
        if (i !== -1) errorInterceptors.splice(i, 1);
      };
    },
  },
};

// --- Built-in: attach auth token ---
requestInterceptors.push((_endpoint, options) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return { ...options, headers };
  }
  return options;
});

// --- Built-in: 401 auto-logout ---
// Only kicks in when an *authenticated* request is rejected. Without the
// /auth/* skip, a wrong OTP returns 401 from /auth/verify-otp and the
// interceptor reload-bounces the user back to the phone screen — making it
// look like the page just refreshed for no reason.
errorInterceptors.push((error, endpoint) => {
  if (error.status !== 401 || typeof window === "undefined") return;
  if (endpoint.startsWith("/auth/")) return; // login/verify own their own UX
  if (!localStorage.getItem("token")) return; // never authed in the first place
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "/login";
});

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  let opts: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  for (const interceptor of requestInterceptors) {
    opts = interceptor(endpoint, opts);
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, opts);

  for (const interceptor of responseInterceptors) {
    res = await interceptor(res, endpoint);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new ApiError(body.error || "Request failed", res.status);
    for (const interceptor of errorInterceptors) {
      interceptor(error, endpoint);
    }
    throw error;
  }

  return res.json();
}

// Auth
export const api = {
  login: (phone: string) =>
    request<{ message: string }>("/auth/login", {
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
      location: string;
      avatar?: string;
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

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return request<{ avatar: string }>("/profile/avatar", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

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
        thumbnail?: string;
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
      images: { id: string; url: string; position: number }[] | null;
      availableFrom?: string;
      createdAt?: string;
      ownerName?: string;
      ownerGender?: string;
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

  uploadListingImages: (listingId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    return request<{ images: { id: string; url: string; position: number }[] }>(
      `/listings/${listingId}/images`,
      {
        method: "POST",
        body: formData,
        headers: {},
      }
    );
  },

  savePgDetails: (listingId: string, data: {
    meals: string;
    sharingType: string;
    ac: boolean;
    wifi: boolean;
    laundry: boolean;
    attachedBathroom: boolean;
    curfew?: string;
    genderPreference: string;
  }) =>
    request<{ message: string }>(`/listings/${listingId}/pg-details`, {
      method: "PUT",
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
  getMessages: (matchId: string, since?: string) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    return request<
      { id: string; senderId: string; message: string; messageType: string; createdAt: string }[]
    >(`/messages/${matchId}${qs}`);
  },

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

  // Reviews
  createReview: (listingId: string, rating: number, comment?: string) =>
    request<{ id: string }>("/reviews", {
      method: "POST",
      body: JSON.stringify({ listingId, rating, comment }),
    }),

  getListingReviews: (listingId: string) =>
    request<{
      averageRating: number;
      reviewCount: number;
      reviews: { id: string; rating: number; comment: string | null; createdAt: string; reviewerName: string }[];
      isPaid: boolean;
    }>(`/reviews/listing/${listingId}`),

  // Plans
  getPlan: () =>
    request<{ plan: string }>("/plan"),

  updatePlan: (plan: string) =>
    request<{ plan: string }>("/plan", {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    }),

  // Rent
  getRentGroups: () =>
    request<import("./types").RentGroup[]>("/rent-groups"),

  getRentGroup: (id: string) =>
    request<import("./types").RentGroupDetail>(`/rent-groups/${id}`),

  createRentGroup: (data: { listingId?: string; name?: string; totalRent: number; dueDay: number; baseRent?: number; commissionType?: string; commissionValue?: number }) =>
    request<{ id: string }>("/rent-groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteRentGroup: (id: string) =>
    request<{ message: string }>(`/rent-groups/${id}`, { method: "DELETE" }),

  addRentMember: (groupId: string, data: { userId: string; shareAmount: number; role?: string }) =>
    request<{ message: string }>(`/rent-groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeRentMember: (groupId: string, userId: string) =>
    request<{ message: string }>(`/rent-groups/${groupId}/members/${userId}`, { method: "DELETE" }),

  updateRentMember: (groupId: string, userId: string, shareAmount: number) =>
    request<{ message: string }>(`/rent-groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ shareAmount }),
    }),

  getMatchedUsers: (groupId: string) =>
    request<import("./types").MatchedUser[]>(`/rent-groups/${groupId}/matched-users`),

  recordRentPayment: (groupId: string, data: { amount: number; month: string; paymentMethod?: string; note?: string }) =>
    request<{ id: string }>(`/rent-groups/${groupId}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRentPayments: (groupId: string, month?: string) =>
    request<import("./types").RentPayment[]>(`/rent-groups/${groupId}/payments${month ? `?month=${month}` : ""}`),

  verifyRentPayment: (paymentId: string) =>
    request<{ message: string }>(`/rent-payments/${paymentId}/verify`, { method: "PATCH" }),

  getCommissions: (groupId: string) =>
    request<import("./types").RentCommission[]>(`/rent-groups/${groupId}/commissions`),

  collectCommission: (commissionId: string) =>
    request<{ message: string }>(`/rent-commissions/${commissionId}/collect`, { method: "PATCH" }),

  // DPDP Act 2023 — right to erasure. Backend requires { confirm: "DELETE MY ACCOUNT" }.
  deleteAccount: (confirm: string) =>
    request<{ message: string }>(`/account`, {
      method: "DELETE",
      body: JSON.stringify({ confirm }),
    }),
};
