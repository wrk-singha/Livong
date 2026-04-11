# 🧾 Livong PRD (Product Requirements Document)

## 🏷️ Product Name
Livong

---

# 🎯 Vision

Build a platform where users can:
- Find compatible roommates  
- Discover rooms / shared spaces  
- Connect and communicate  

👉 Long-term: Become a complete living experience platform.

---

# 🚨 Problem Statement

Users currently:
- Use multiple platforms (Housing, WhatsApp, Facebook groups)
- Lack trust in unknown roommates
- Spend too much time searching

👉 Need: One platform combining people + place + trust.

---

# 👥 Target Users

- Working professionals (22–35)
- People relocating to cities (start with Bangalore)

---

# 💡 Core Value Proposition

👉 “Find the right place and the right people to live with”
---

# 🏆 Unique Selling Proposition

### Trust-First Living Platform
Livong is the only roommate platform that **verifies real people** before they connect.

| USP | What it means |
|-----|---------------|
| **Verified identities** | Live video selfie + KYC document check — no fake profiles |
| **Safe contact sharing** | Phone/email shared only after mutual match, inside chat |
| **Location intelligence** | See listings on a real map, search by radius around any point |
| **AI-powered insights (Phase 2)** | Know what's near a listing — hospitals, metros, groceries — before you visit |

👉 Competitors let anyone message anyone. Livong ensures **trust before connection**.
---

# 🧩 MVP Features

## 1. Authentication
- Phone OTP login

---

## 2. Profile (Quick + Progressive)

### Mandatory:
- Budget
- Location
- Gender

### Optional (collected over time):
- Smoking
- Drinking
- Cleanliness
- Sleep schedule
- Work schedule
- Pets
- Food preference

---

## 3. Listings
- Post room / flat
- Add rent, location, description

---

## 4. Explore
- Browse listings and users
- Filter by location and budget

---

## 5. Interest System
- Send interest
- Accept / reject

---

## 6. Match System
- Match created on acceptance

---

## 7. Chat
- 1:1 chat after match
- Contact info sharing (phone/email) within chat after match

---

## 8. Trust & Verification

### Live Video Authentication
- Selfie liveness check on signup
- Captures a short video to confirm real person
- Stores verification status on profile

### KYC Document Verification
- Upload government ID (Aadhaar / PAN / Passport)
- Backend validates document and marks profile as KYC-verified
- Verified badge shown on profile & listings

---

## 9. Location & Maps

### Location Sharing
- Listings include lat/lng coordinates + full text address
- Map view (Google Maps) on listing detail page
- Users can pin location when creating a listing

### Radius-Based Search
- Search rooms within X km of a chosen location
- Filter by distance on explore page
- Backend uses PostGIS or Haversine distance calculation

---

# 🔄 User Flow

Login → Profile Setup → Explore → Send Interest → Match → Chat

---

# 📊 Success Metrics

## Primary:
- % users getting at least 1 match

## Secondary:
- Profile completion rate
- Match to chat conversion
- Time to first match

---

# 🚫 Out of Scope (MVP)

- PG / full rentals
- Payments
- Services (tiffin, cleaning)
- Expense splitting

---

# 🔮 Phase 2 Roadmap

| Feature | Description |
|---------|-------------|
| **AI Facilities Agent** | AI-powered chat agent that tells users about nearby facilities (hospitals, metros, groceries, gyms, schools) for any listing location |
| **Smart Matching** | AI-based compatibility scoring using preference history |
| **Reviews & Ratings** | Post-living reviews for roommates and listings |

---

# 🧠 Product Principles

- Keep onboarding simple
- Collect data gradually
- Focus on matching success
- Build trust

---

# ✅ MVP Definition of Done

- User can login
- Create profile
- **Verify identity** (live video + KYC)
- Explore listings/users
- **Search by location radius**
- **View listings on map**
- Send interest
- Match
- Chat
- **Share contact info in chat**

---

**Livong = Living Experience Platform 🚀**
