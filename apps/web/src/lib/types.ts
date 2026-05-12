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
  location: string;
  avatar?: string;
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

export interface PgDetails {
  meals: string;
  sharingType: string;
  ac: boolean;
  wifi: boolean;
  laundry: boolean;
  attachedBathroom: boolean;
  curfew?: string;
  genderPreference: string;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  rent: number;
  location: string;
  propertyType: string;
}

export interface RentGroup {
  id: string;
  listingId: string;
  name?: string;
  totalRent: number;
  dueDay: number;
  createdBy: string;
  listingTitle?: string;
  listingLocation?: string;
  memberCount: number;
  paidCount: number;
  overdue: boolean;
  month: string;
  baseRent?: number;
  commissionType?: string;
  commissionValue?: number;
  commissionAmount?: number;
}

export interface RentMember {
  userId: string;
  name: string;
  shareAmount: number;
  role: string;
  paymentStatus: "unpaid" | "pending" | "verified";
  paymentId?: string;
}

export interface RentGroupDetail {
  id: string;
  listingId: string;
  name?: string;
  totalRent: number;
  dueDay: number;
  createdBy: string;
  listingTitle?: string;
  listingLocation?: string;
  members: RentMember[];
  month: string;
  overdue: boolean;
  baseRent?: number;
  commissionType?: string;
  commissionValue?: number;
  commissionAmount?: number;
}

export interface RentPayment {
  id: string;
  payerId: string;
  payerName: string;
  amount: number;
  month: string;
  paymentMethod: string;
  status: "pending" | "verified";
  note?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface MatchedUser {
  id: string;
  name: string;
}

export interface RentCommission {
  id: string;
  month: string;
  amount: number;
  status: "pending" | "collected";
  collectedAt?: string;
  createdAt: string;
}

export interface ReceivedInterest {
  id: string;
  senderId: string;
  senderName: string;
  senderAge?: number;
  senderGender: string;
  senderLocation: string;
  senderAvatar?: string;
  listingId: string;
  listingTitle: string;
  listingLocation: string;
  createdAt?: string;
}
