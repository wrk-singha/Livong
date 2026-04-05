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
  "propertyType": "room"
}
```

---

## GET /listings

### Query Params:
- location
- minBudget
- maxBudget

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

# 🎯 Notes

- All protected routes require JWT token
- Keep responses simple for MVP
- Expand later with filters, pagination, and validations

---

**Livong API 🚀**
