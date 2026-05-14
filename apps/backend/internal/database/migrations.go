package database

import (
	"database/sql"
	"fmt"
)

func RunMigrations(db *sql.DB) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			phone VARCHAR(15) UNIQUE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS profiles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id) UNIQUE,
			name VARCHAR(100),
			age INT,
			gender VARCHAR(10),
			location TEXT,
			avatar VARCHAR(255),
			smoking VARCHAR(20),
			drinking VARCHAR(20),
			cleanliness VARCHAR(20),
			sleep_schedule VARCHAR(20),
			work_schedule VARCHAR(20),
			pets VARCHAR(20),
			food_preference VARCHAR(20),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS listings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id),
			title VARCHAR(255),
			description TEXT,
			rent INT,
			location TEXT,
			property_type VARCHAR(20),
			available_from DATE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS interests (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			sender_id UUID REFERENCES users(id),
			receiver_id UUID REFERENCES users(id),
			listing_id UUID REFERENCES listings(id),
			status VARCHAR(20) DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS matches (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user1_id UUID REFERENCES users(id),
			user2_id UUID REFERENCES users(id),
			listing_id UUID REFERENCES listings(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			match_id UUID REFERENCES matches(id),
			sender_id UUID REFERENCES users(id),
			message TEXT,
			message_type VARCHAR(20) DEFAULT 'text',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		// Add message_type column if missing (for existing databases)
		`DO $$ BEGIN
			ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`CREATE TABLE IF NOT EXISTS listing_images (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
			filename VARCHAR(255) NOT NULL,
			position INT DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`DO $$ BEGIN
			ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`CREATE TABLE IF NOT EXISTS reviews (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			reviewer_id UUID REFERENCES users(id),
			listing_id UUID REFERENCES listings(id),
			rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
			comment TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(reviewer_id, listing_id)
		)`,
		`DO $$ BEGIN
			ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`DO $$ BEGIN
			ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`INSERT INTO users (phone, is_admin) VALUES ('7908038179', true) ON CONFLICT (phone) DO UPDATE SET is_admin = true`,
		`CREATE TABLE IF NOT EXISTS payments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id),
			plan VARCHAR(20) NOT NULL,
			amount INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS pg_details (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			listing_id UUID REFERENCES listings(id) ON DELETE CASCADE UNIQUE,
			meals VARCHAR(20) DEFAULT 'none',
			sharing_type VARCHAR(20) DEFAULT 'single',
			ac BOOLEAN DEFAULT false,
			wifi BOOLEAN DEFAULT false,
			laundry BOOLEAN DEFAULT false,
			attached_bathroom BOOLEAN DEFAULT false,
			curfew VARCHAR(50),
			gender_preference VARCHAR(20) DEFAULT 'any',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS rent_groups (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
			name VARCHAR(100),
			total_rent INT NOT NULL,
			due_day INT NOT NULL DEFAULT 1,
			created_by UUID REFERENCES users(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_groups_listing ON rent_groups(listing_id) WHERE listing_id IS NOT NULL`,
		`CREATE TABLE IF NOT EXISTS rent_members (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
			user_id UUID REFERENCES users(id),
			share_amount INT NOT NULL,
			role VARCHAR(20) DEFAULT 'tenant',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(rent_group_id, user_id)
		)`,
		`DO $$ BEGIN
			ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_broker BOOLEAN DEFAULT false;
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`DO $$ BEGIN
			ALTER TABLE rent_groups ADD COLUMN IF NOT EXISTS base_rent INT;
			ALTER TABLE rent_groups ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20);
			ALTER TABLE rent_groups ADD COLUMN IF NOT EXISTS commission_value INT;
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`CREATE TABLE IF NOT EXISTS rent_commissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
			broker_id UUID REFERENCES users(id),
			month VARCHAR(7) NOT NULL,
			amount INT NOT NULL,
			status VARCHAR(20) DEFAULT 'pending',
			collected_at TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(rent_group_id, month)
		)`,
		`CREATE TABLE IF NOT EXISTS rent_payments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			rent_group_id UUID REFERENCES rent_groups(id) ON DELETE CASCADE,
			payer_id UUID REFERENCES users(id),
			amount INT NOT NULL,
			month VARCHAR(7) NOT NULL,
			payment_method VARCHAR(20) DEFAULT 'offline',
			note VARCHAR(500),
			payer_confirmed BOOLEAN DEFAULT true,
			receiver_confirmed BOOLEAN DEFAULT false,
			confirmed_by UUID REFERENCES users(id),
			confirmed_at TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(rent_group_id, payer_id, month)
		)`,
		// Account deletion tracking — DPDP Act 2023 (India) Sec. 12 right to erasure.
		// Soft-delete: keeps anonymized rows for safety/audit while removing PII.
		`DO $$ BEGIN
			ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
		EXCEPTION WHEN others THEN NULL;
		END $$`,
		`CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL`,

		// User reports — for safety incidents on listings, profiles, messages.
		// target_type one of 'listing' | 'profile' | 'message'.
		// status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'.
		`CREATE TABLE IF NOT EXISTS reports (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			reporter_id UUID NOT NULL REFERENCES users(id),
			target_type VARCHAR(20) NOT NULL,
			target_id UUID NOT NULL,
			reason VARCHAR(40) NOT NULL,
			details TEXT,
			status VARCHAR(20) DEFAULT 'pending',
			reviewed_at TIMESTAMP,
			reviewed_by UUID REFERENCES users(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id)`,

		// User blocks — symmetric soft-block. blocker stops seeing/being-seen-by blocked.
		// UNIQUE on the pair so a single user can't block the same person twice.
		`CREATE TABLE IF NOT EXISTS user_blocks (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(blocker_id, blocked_id),
			CHECK (blocker_id <> blocked_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id)`,

		// Feature flags — admin-toggleable kill switches. Read by both
		// backends; only admin writes. `key` is a stable string (e.g.
		// "maintenance_mode", "chat_enabled"); new flag = INSERT here.
		`CREATE TABLE IF NOT EXISTS feature_flags (
			key TEXT PRIMARY KEY,
			enabled BOOLEAN NOT NULL DEFAULT TRUE,
			description TEXT,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		// Seed the known flags (idempotent). Adding a new flag = add it here.
		`INSERT INTO feature_flags (key, enabled, description) VALUES
			('maintenance_mode', FALSE, 'When ON: API returns 503 except auth/admin/flags; frontend shows maintenance page'),
			('chat_enabled', TRUE, 'In-app messaging between matched users'),
			('rent_enabled', TRUE, 'Rent group tracking + broker commissions'),
			('interests_enabled', TRUE, 'Sending interest on listings'),
			('create_listing_enabled', TRUE, 'Posting new listings'),
			('profile_delete_enabled', TRUE, 'DPDP §12 self-serve account deletion')
		ON CONFLICT (key) DO NOTHING`,
	}

	for i, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}

	return nil
}
