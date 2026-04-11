// API Response Types

export interface User {
  id: string;
  phone: string;
  createdAt: string;
}

export interface Profile {
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
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  propertyType: string;
  availableFrom?: string;
  createdAt: string;
}

export interface Interest {
  id: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Match {
  matchId: string;
  listingId: string;
  user: {
    id: string;
    name: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  message: string;
  messageType: string;
  createdAt: string;
}

// API Request Types

export interface LoginRequest {
  phone: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface CreateProfileRequest {
  name: string;
  age: number;
  gender: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
}

export interface UpdateProfileRequest {
  smoking?: string;
  drinking?: string;
  cleanliness?: string;
  sleepSchedule?: string;
  workSchedule?: string;
  pets?: string;
  foodPreference?: string;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  rent: number;
  location: string;
  propertyType: string;
}
