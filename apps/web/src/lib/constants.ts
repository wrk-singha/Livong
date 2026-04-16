export const INTEREST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export const PROPERTY_TYPES = {
  ROOM: "room",
  FLAT: "flat",
  SHARED: "shared",
  PG: "pg",
} as const;

export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const;

export const SMOKING = {
  YES: "yes",
  NO: "no",
  OCCASIONALLY: "occasionally",
} as const;

export const DRINKING = {
  YES: "yes",
  NO: "no",
  OCCASIONALLY: "occasionally",
} as const;

export const CLEANLINESS = {
  HIGH: "high",
  MODERATE: "moderate",
  LOW: "low",
} as const;

export const SLEEP_SCHEDULE = {
  EARLY: "early",
  LATE: "late",
  FLEXIBLE: "flexible",
} as const;

export const FOOD_PREFERENCE = {
  VEG: "veg",
  NON_VEG: "non-veg",
  VEGAN: "vegan",
  NO_PREFERENCE: "no-preference",
} as const;
