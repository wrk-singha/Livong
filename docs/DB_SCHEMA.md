# 🗄️ Livong Database Schema (MVP)

## 📌 Overview

This document defines the database schema for the Livong MVP.

Database: PostgreSQL

---

# 🧑 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255),
    video_verified BOOLEAN DEFAULT FALSE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 👤 Profiles Table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),

    name VARCHAR(100),
    age INT,
    gender VARCHAR(10),

    budget_min INT,
    budget_max INT,
    location TEXT,

    smoking VARCHAR(20),
    drinking VARCHAR(20),
    cleanliness VARCHAR(20),
    sleep_schedule VARCHAR(20),
    work_schedule VARCHAR(20),
    pets VARCHAR(20),
    food_preference VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 🏠 Listings Table

```sql
CREATE TABLE listings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),

    title VARCHAR(255),
    description TEXT,

    rent INT,
    location TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    property_type VARCHAR(20),

    available_from DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_location ON listings (latitude, longitude);
```

---

# ❤️ Interests Table

```sql
CREATE TABLE interests (
    id UUID PRIMARY KEY,

    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),

    listing_id UUID REFERENCES listings(id),

    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 🤝 Matches Table

```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY,

    user1_id UUID REFERENCES users(id),
    user2_id UUID REFERENCES users(id),

    listing_id UUID REFERENCES listings(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 💬 Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,

    match_id UUID REFERENCES matches(id),

    sender_id UUID REFERENCES users(id),
    message TEXT,
    message_type VARCHAR(20) DEFAULT 'text',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> `message_type`: `"text"` | `"contact_share"`  
> For `contact_share`, the `message` field contains JSON: `{"contactType": "phone", "contactValue": "+91..."}`

---

# 🛡️ Verifications Table

```sql
CREATE TABLE verifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),

    type VARCHAR(20) NOT NULL,
    document_type VARCHAR(20),
    file_path TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> `type`: `"video"` | `"kyc"`  
> `document_type`: `"aadhaar"` | `"pan"` | `"passport"` (only for KYC)  
> `status`: `"pending"` | `"verified"` | `"rejected"`  
> `file_path`: path to stored file (never exposed to other users)

---

# ⭐ Reviews Table (Future)

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,

    reviewer_id UUID REFERENCES users(id),
    target_id UUID,

    target_type VARCHAR(20),
    rating INT,
    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 🔗 Relationships Summary

- users → profiles (1:1)
- users → listings (1:N)
- users → interests (N:N via interests)
- users → verifications (1:N)
- interests → matches
- matches → messages (including contact shares)
- matches → messages

---

# 🎯 Notes

- UUIDs recommended for scalability
- Keep schema simple for MVP
- Add indexes later based on queries

---

**Livong DB Schema 🚀**
