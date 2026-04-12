# Livong API Documentation

## Overview

REST API built with Go + Gin. All endpoints return JSON.

**Base URL (dev):** `http://localhost:8080`
**Base URL (prod):** `https://api.livong.app`

---

## Authentication

All protected routes require:
```
Authorization: Bearer <token>
```

### POST /auth/login

Request:
```json
{ "phone": "+919876543210" }
```

Response:
```json
{ "message": "OTP sent", "otp": "123456" }
```

> In dev mode, OTP is returned in the response. In production, it will be sent via SMS.

### POST /auth/verify-otp

Request:
```json
{ "phone": "+919876543210", "otp": "123456" }
```

Response:
```json
{ "userId": "uuid", "token": "jwt-token" }
```

---

## Profile

### GET /profile
Returns the authenticated user's profile.

Response:
```json
{
  "id": "uuid",
  "name": "Rohit",
  "age": 25,
  "gender": "male",
  "budgetMin": 10000,
  "budgetMax": 20000,
  "location": "Bangalore",
  "smoking": "no",
  "drinking": "occasionally",
  "cleanliness": "high",
  "sleepSchedule": "late",
  "workSchedule": "hybrid",
  "pets": "no",
  "foodPreference": "veg"
}
```

### POST /profile
Create profile (required fields).

Request:
```json
{
  "name": "Rohit",
  "age": 25,
  "gender": "male",
  "budgetMin": 10000,
  "budgetMax": 20000,
  "location": "Bangalore"
}
```

Response:
```json
{ "id": "uuid" }
```

### PATCH /profile
Partial update (any subset of optional fields).

Request:
```json
{
  "smoking": "no",
  "drinking": "occasionally",
  "cleanliness": "moderate"
}
```

Response:
```json
{ "message": "Profile updated" }
```

---

## Listings

### GET /listings
List all listings. Supports optional filters.

Query params:
- `location` — text match (ILIKE)
- `minBudget` — minimum rent
- `maxBudget` — maximum rent

Response:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "1 Room Available",
    "description": "Furnished room near metro",
    "rent": 15000,
    "location": "HSR Layout",
    "propertyType": "room",
    "thumbnail": "/uploads/listing-uuid/abc123.jpg"
  }
]
```

### GET /listings/:id
Get a single listing by ID. Includes all images.

Response:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "1 Room Available",
  "description": "Furnished room near metro",
  "rent": 15000,
  "location": "HSR Layout",
  "propertyType": "room",
  "images": [
    { "id": "uuid", "url": "/uploads/listing-uuid/abc123.jpg", "position": 0 }
  ]
}
```

### POST /listings
Create a new listing.

Request:
```json
{
  "title": "1 Room Available",
  "description": "Furnished room near metro",
  "rent": 15000,
  "location": "HSR Layout",
  "propertyType": "room"
}
```

Response:
```json
{ "id": "uuid" }
```

### POST /listings/:id/images
Upload images for a listing. Only the listing owner can upload. Max 10 images, max 5MB each.

Request: `multipart/form-data` with field `images` (multiple files).

Allowed types: jpg, jpeg, png, webp.

Response:
```json
{
  "images": [
    { "id": "uuid", "url": "/uploads/listing-uuid/abc123.jpg", "position": 0 }
  ]
}
```

> Images are served statically at `GET /uploads/{path}`.

---

## Interests

### POST /interests
Send interest to a listing owner.

Request:
```json
{
  "receiverId": "uuid",
  "listingId": "uuid"
}
```

Response:
```json
{ "id": "uuid" }
```

> Prevents duplicate interests and self-interests.

### PATCH /interests/:id
Accept or reject an interest.

Request:
```json
{ "status": "accepted" }
```

Response:
```json
{ "message": "Interest updated" }
```

> When status is "accepted", a match is automatically created.

---

## Matches

### GET /matches
Get all matches for the authenticated user.

Response:
```json
[
  {
    "matchId": "uuid",
    "listingId": "uuid",
    "user": { "id": "uuid", "name": "Priya" }
  }
]
```

---

## Messages

### GET /messages/:matchId
Get all messages in a match conversation.

Response:
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "message": "Hey, is the room still available?",
    "messageType": "text",
    "createdAt": "2026-04-10T10:30:00Z"
  },
  {
    "id": "uuid",
    "senderId": "uuid",
    "message": "{\"contactType\":\"phone\",\"contactValue\":\"+919876543210\"}",
    "messageType": "contact_share",
    "createdAt": "2026-04-10T10:35:00Z"
  }
]
```

### POST /messages
Send a text message.

Request:
```json
{
  "matchId": "uuid",
  "message": "Hey, is the room still available?"
}
```

Response:
```json
{ "id": "uuid" }
```

### POST /messages/share-contact
Share contact info with a matched user.

Request:
```json
{
  "matchId": "uuid",
  "contactType": "phone",
  "contactValue": "+919876543210"
}
```

Response:
```json
{
  "id": "uuid",
  "messageType": "contact_share"
}
```

> `contactType`: "phone" or "email". Only allowed between matched users.

---

## Reviews

### POST /reviews
Create a review for a listing. Requires match on the listing.

Request:
```json
{
  "listingId": "uuid",
  "rating": 4,
  "comment": "Great roommate, very clean and respectful"
}
```

Response:
```json
{ "id": "uuid" }
```

> Rating 1-5 required. Comment optional. Cannot review own listing. One review per user per listing.

### GET /reviews/listing/:listingId
Get reviews for a listing.

Response:
```json
{
  "averageRating": 4.2,
  "reviewCount": 5,
  "reviews": [
    {
      "id": "uuid",
      "rating": 4,
      "comment": "Great experience",
      "createdAt": "2024-01-15T10:30:00Z",
      "reviewerName": "John"
    }
  ],
  "isPaid": false
}
```

> `comment` is `null` for free-plan users (review text hidden behind paywall). `isPaid` indicates if the requesting user has a paid plan.

---

## Plans

### GET /plan
Get current user's plan.

Response:
```json
{ "plan": "free" }
```

### PATCH /plan
Update user's plan.

Request:
```json
{ "plan": "basic" }
```

Response:
```json
{ "plan": "basic" }
```

> Valid plans: `free`, `basic`, `pro`. Basic and Pro unlock full review details.

---

## Notes

- All protected routes require JWT token in Authorization header
- All request/response bodies are JSON
- UUIDs used for all IDs
- Errors return `{ "error": "message" }` with appropriate HTTP status
