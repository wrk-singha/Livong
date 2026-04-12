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
	}

	for i, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}

	return nil
}
