# Livong Database Schema

## Overview

PostgreSQL database. All tables use UUID primary keys. Migrations run inline at startup via `CREATE TABLE IF NOT EXISTS`.

---

## Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Profiles

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

## Listings

```sql
CREATE TABLE listings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    description TEXT,
    rent INT,
    location TEXT,
    property_type VARCHAR(20),
    available_from DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Interests

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

## Matches

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

## Messages

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

`message_type`: "text" or "contact_share"

For contact shares, `message` contains JSON:
```json
{ "contactType": "phone", "contactValue": "+919876543210" }
```

---

## Listing Images

```sql
CREATE TABLE listing_images (
    id UUID PRIMARY KEY,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Images stored on disk under `uploads/{listing_id}/{random_hex}.{ext}`. Max 10 per listing, max 5MB each. Allowed: jpg, jpeg, png, webp.

---

## Relationships

```
users 1:1 profiles
users 1:N listings
listings 1:N listing_images
users N:N interests (sender/receiver)
interests -> matches (on accept)
matches 1:N messages
```

---

## Notes

- No separate migration files — all DDL runs inline from `database.RunMigrations()` at startup
- All IDs are UUIDs generated in Go
- No indexes beyond primary keys currently (add based on query patterns as needed)
