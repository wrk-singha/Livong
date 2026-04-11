# Livong PRD (Product Requirements Document)

## Product Name
Livong

## Vision

A platform where users find compatible roommates, discover rooms/shared spaces, and connect safely.

Long-term: a complete living experience platform.

---

## Problem

- Users juggle multiple platforms (Housing, WhatsApp groups, Facebook)
- No trust mechanism for unknown roommates
- Too much time spent searching

**Need:** One platform combining people + place + trust.

---

## Target Users

- Working professionals (22-35)
- People relocating to cities (starting with Bangalore)

---

## Core Value Proposition

> "Find the right place and the right people to live with"

---

## MVP Features (Implemented)

### 1. Authentication
- Phone number + OTP login
- JWT-based sessions (7-day expiry)
- OTP returned in response (dev mode, no SMS integration yet)

### 2. Profile
**Mandatory:** name, age, gender, budget range, location

**Optional (editable anytime):** smoking, drinking, cleanliness, sleep schedule, work schedule, pets, food preference

### 3. Listings
- Post room/flat with title, description, rent, location, property type
- Browse all listings
- Filter by location and budget range

### 4. Interest System
- Send interest on a listing
- Accept or reject received interests
- Duplicate and self-interest prevention

### 5. Match System
- Match auto-created when interest is accepted
- Both users can then chat

### 6. Chat
- 1:1 messaging between matched users
- Contact sharing (phone or email) as a special message type within chat

### 7. PWA Support
- Installable on mobile devices
- Service worker for offline shell
- Responsive layout (sidebar on desktop, bottom nav on mobile)

---

## User Flow

```
Login -> Profile Setup -> Explore Listings -> Send Interest -> Match -> Chat -> Share Contact
```

---

## Success Metrics

**Primary:** % users getting at least 1 match

**Secondary:**
- Profile completion rate
- Match-to-chat conversion
- Time to first match

---

## Out of Scope (MVP)

- PG / full rentals
- Payments
- Services (tiffin, cleaning)
- Expense splitting
- Identity verification (video/KYC)
- Maps / geocoding / radius search
- AI matching or recommendations

---

## Phase 2 Roadmap

| Feature | Description |
|---------|-------------|
| Identity verification | Live video selfie + KYC document upload for trust badges |
| Location & maps | Geocoding, lat/lng on listings, radius search, map view |
| AI facilities agent | Tell users about nearby hospitals, metros, groceries for any listing |
| Smart matching | Compatibility scoring based on preferences |
| Reviews & ratings | Post-living reviews for roommates |
| Real-time chat | WebSocket-based messaging |

---

## Design Principles

- Keep onboarding simple
- Collect data gradually
- Focus on matching success
- Build trust
- Performance over visual complexity
