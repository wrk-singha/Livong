# 🔗 Livong API Documentation (MVP)

## 📌 Overview

This document defines the API contract between frontend and backend for Livong.

Base URL:
```
https://api.livong.app
```

---

# 🔐 Authentication

## POST /auth/login

### Request:
```json
{
  "phone": "string"
}
```

### Response:
```json
{
  "userId": "string",
  "token": "string"
}
```

---

## POST /auth/verify-otp

### Request:
```json
{
  "phone": "string",
  "otp": "string"
}
```

### Response:
```json
{
  "token": "string"
}
```

---

# 👤 Profile

## GET /profile

### Headers:
```
Authorization: Bearer <token>
```

### Response:
```json
{
  "id": "string",
  "name": "string",
  "budgetMin": 10000,
  "budgetMax": 20000,
  "location": "string"
}
```

---

## POST /profile

### Request:
```json
{
  "name": "string",
  "age": 25,
  "gender": "male",
  "budgetMin": 10000,
  "budgetMax": 20000,
  "location": "Bangalore"
}
```

---

## PATCH /profile

### Request:
```json
{
  "smoking": "no",
  "drinking": "occasionally",
  "cleanliness": "moderate",
  "sleepSchedule": "late"
}
```

---

# 🏠 Listings

## POST /listings

### Request:
```json
{
  "title": "1 Room Available",
  "description": "Furnished room",
  "rent": 15000,
  "location": "HSR Layout",
  "address": "123, 27th Main, HSR Layout Sector 1, Bangalore 560102",
  "latitude": 12.9141,
  "longitude": 77.6368,
  "propertyType": "room"
}
```

---

## GET /listings

### Query Params:
- location
- minBudget
- maxBudget
- **lat** (optional — for radius search)
- **lng** (optional — for radius search)
- **radiusKm** (optional — default 5, max 50)

---

## GET /listings/:id

---

# ❤️ Interests

## POST /interests

### Request:
```json
{
  "receiverId": "string",
  "listingId": "string"
}
```

---

## PATCH /interests/:id

### Request:
```json
{
  "status": "accepted"
}
```

---

# 🤝 Matches

## GET /matches

### Response:
```json
[
  {
    "matchId": "string",
    "user": {}
  }
]
```

---

# 💬 Messages

## GET /messages/:matchId

---

## POST /messages

### Request:
```json
{
  "matchId": "string",
  "message": "Hello!"
}
```

---

## POST /messages/share-contact

Share contact info with a matched user inside chat.

### Request:
```json
{
  "matchId": "string",
  "contactType": "phone",
  "contactValue": "+919876543210"
}
```

### Response:
```json
{
  "id": "string",
  "matchId": "string",
  "senderId": "string",
  "contactType": "phone",
  "contactValue": "+919876543210",
  "createdAt": "timestamp"
}
```

### Notes:
- `contactType`: `"phone"` or `"email"`
- Only allowed between matched users
- Stored as a special message type

---

# 🛡️ Verification

## POST /verification/video

Upload a live video selfie for identity verification.

### Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Request:
- `video` — video file (max 10MB, mp4/webm)

### Response:
```json
{
  "status": "submitted",
  "videoVerified": false
}
```

---

## POST /verification/kyc

Upload a government ID document for KYC verification.

### Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Request:
- `document` — image file (max 5MB, jpg/png/pdf)
- `documentType` — `"aadhaar"` | `"pan"` | `"passport"`

### Response:
```json
{
  "status": "submitted",
  "kycVerified": false,
  "documentType": "aadhaar"
}
```

---

## GET /verification/status

### Response:
```json
{
  "videoVerified": true,
  "kycVerified": false,
  "kycDocumentType": "aadhaar",
  "submittedAt": "timestamp"
}
```

---

# 🎯 Notes

- All protected routes require JWT token
- Keep responses simple for MVP
- Expand later with filters, pagination, and validations
- **Verification endpoints accept multipart/form-data, not JSON**
- **Contact sharing is only permitted between matched users**
- **Radius search uses Haversine distance on the backend**

---

# 🔮 Phase 2 APIs (Planned)

## GET /ai/facilities?lat=X&lng=Y

Returns nearby facilities (hospitals, metros, groceries, gyms) for a given location using an AI agent.

### Response:
```json
{
  "facilities": [
    { "type": "metro", "name": "HSR Metro Station", "distanceKm": 0.8 },
    { "type": "hospital", "name": "Apollo Clinic", "distanceKm": 1.2 },
    { "type": "grocery", "name": "DMart", "distanceKm": 0.5 }
  ]
}
```

---

**Livong API 🚀**
