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
    location TEXT,
    smoking VARCHAR(20),
    drinking VARCHAR(20),
    cleanliness VARCHAR(20),
    sleep_schedule VARCHAR(20),
    work_schedule VARCHAR(20),
    pets VARCHAR(20),
    food_preference VARCHAR(20),
    is_broker BOOLEAN DEFAULT FALSE,
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

## Rent Groups

```sql
CREATE TABLE rent_groups (
    id UUID PRIMARY KEY,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    name VARCHAR(100),
    total_rent INT NOT NULL,
    due_day INT DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    base_rent INT,
    commission_type VARCHAR(20),
    commission_value INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> `listing_id` can be null for standalone groups created by brokers or third parties.

## Rent Members

```sql
CREATE TABLE rent_members (
    id UUID PRIMARY KEY,
    rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    share_amount INT NOT NULL,
    role VARCHAR(20) DEFAULT 'tenant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rent_group_id, user_id)
);
```

## Rent Payments

```sql
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY,
    rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
    payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    month VARCHAR(7) NOT NULL,
    payment_method VARCHAR(50),
    note TEXT,
    payer_confirmed BOOLEAN DEFAULT TRUE,
    receiver_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rent_group_id, payer_id, month)
);
```

## Rent Commissions

```sql
CREATE TABLE rent_commissions (
    id UUID PRIMARY KEY,
    rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    amount INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    collected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rent_group_id, month)
);
```

---

## Relationships

```
users 1:1 profiles
users 1:N listings
listings 1:N listing_images
listings 1:N reviews
users 1:N reviews (as reviewer)
users N:N interests (sender/receiver)
interests -> matches (on accept)
matches 1:N messages
rent_groups 1:N rent_members
rent_groups 1:N rent_payments
rent_groups 1:N rent_commissions
users 1:N rent_groups (as creator/broker)
users 1:N rent_payments (as payer)
```

---

## Reviews

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    reviewer_id UUID REFERENCES users(id),
    listing_id UUID REFERENCES listings(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, listing_id)
);
```

> Users can only review listings they were matched on. One review per user per listing. Comment text is only visible to paid-plan users.

---

## Notes

- `users.plan` column: `VARCHAR(20) DEFAULT 'free'` — controls access to review details
- Broker status is stored in `profiles.is_broker`
- No separate migration files — all DDL runs inline from `database.RunMigrations()` at startup
- All IDs are UUIDs generated in Go
- Rent tables include uniqueness protection for member membership, monthly payments, and monthly commission creation
- `rent_groups.listing_id` uses a partial unique index when present so one listing can only have one linked rent group
