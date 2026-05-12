// Package seed creates a representative set of test data for local development.
// Idempotent: every Run() first deletes anything tagged with TestPhonePrefix
// then re-inserts. Safe to run repeatedly. NEVER call from production.
package seed

import (
	"database/sql"
	"fmt"
	"strings"
)

// TestPhonePrefix marks all seeded users so cleanup can find them.
// Real users in India never have "+91999999" as a phone prefix because
// 9999 is reserved/test-pool by TRAI.
const TestPhonePrefix = "+91999999"

// Run wipes prior test data + seeds a fresh fixture.
func Run(db *sql.DB) error {
	if err := cleanup(db); err != nil {
		return fmt.Errorf("cleanup: %w", err)
	}
	users, err := seedUsers(db)
	if err != nil {
		return fmt.Errorf("users: %w", err)
	}
	listings, err := seedListings(db, users)
	if err != nil {
		return fmt.Errorf("listings: %w", err)
	}
	if err := seedInterestsAndMatches(db, users, listings); err != nil {
		return fmt.Errorf("interests/matches: %w", err)
	}
	if err := seedMessages(db, users, listings); err != nil {
		return fmt.Errorf("messages: %w", err)
	}
	if err := seedReview(db, users, listings); err != nil {
		return fmt.Errorf("reviews: %w", err)
	}
	return nil
}

// cleanup deletes everything reachable from test users. Order matters: child
// rows first (FKs cascade where defined; explicit deletes elsewhere).
func cleanup(db *sql.DB) error {
	stmts := []string{
		// Match rows referencing test users
		`DELETE FROM messages WHERE match_id IN (SELECT id FROM matches WHERE user1_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%') OR user2_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%'))`,
		`DELETE FROM matches WHERE user1_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%') OR user2_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%')`,
		`DELETE FROM interests WHERE sender_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%') OR receiver_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%')`,
		`DELETE FROM reviews WHERE reviewer_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%')`,
		// listings cascades to listing_images via ON DELETE CASCADE
		`DELETE FROM listings WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%')`,
		`DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '` + TestPhonePrefix + `%')`,
		`DELETE FROM users WHERE phone LIKE '` + TestPhonePrefix + `%'`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("delete: %w (stmt: %s)", err, s[:min(80, len(s))])
		}
	}
	return nil
}

type seedUser struct {
	ID, Phone, Name, Gender, Location string
	Age                               int
	Smoking, Drinking, Cleanliness    string
	Sleep, Work, Pets, Food           string
}

// SeededUsers gives the dev a stable map of "what users exist after seeding".
// Phones are deterministic so dev-login always works against them.
func SeededUsers() []seedUser {
	return []seedUser{
		{Phone: TestPhonePrefix + "01", Name: "Rahul Sharma", Age: 27, Gender: "male", Location: "Bengaluru", Smoking: "no", Drinking: "occasionally", Cleanliness: "high", Sleep: "early", Work: "office", Pets: "no", Food: "veg"},
		{Phone: TestPhonePrefix + "02", Name: "Priya Iyer", Age: 25, Gender: "female", Location: "Bengaluru", Smoking: "no", Drinking: "no", Cleanliness: "high", Sleep: "early", Work: "hybrid", Pets: "yes", Food: "veg"},
		{Phone: TestPhonePrefix + "03", Name: "Ankit Verma", Age: 29, Gender: "male", Location: "Bengaluru", Smoking: "occasionally", Drinking: "yes", Cleanliness: "moderate", Sleep: "late", Work: "remote", Pets: "no", Food: "non-veg"},
		{Phone: TestPhonePrefix + "04", Name: "Sneha Patel", Age: 26, Gender: "female", Location: "Pune", Smoking: "no", Drinking: "occasionally", Cleanliness: "high", Sleep: "flexible", Work: "remote", Pets: "no", Food: "veg"},
		{Phone: TestPhonePrefix + "05", Name: "Karthik Menon", Age: 31, Gender: "male", Location: "Hyderabad", Smoking: "no", Drinking: "no", Cleanliness: "moderate", Sleep: "early", Work: "office", Pets: "no", Food: "non-veg"},
	}
}

func seedUsers(db *sql.DB) ([]seedUser, error) {
	users := SeededUsers()
	for i, u := range users {
		var id string
		err := db.QueryRow(`INSERT INTO users (phone) VALUES ($1) RETURNING id`, u.Phone).Scan(&id)
		if err != nil {
			return nil, err
		}
		users[i].ID = id
		_, err = db.Exec(`
			INSERT INTO profiles (user_id, name, age, gender, location, smoking, drinking, cleanliness, sleep_schedule, work_schedule, pets, food_preference)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		`, id, u.Name, u.Age, u.Gender, u.Location, u.Smoking, u.Drinking, u.Cleanliness, u.Sleep, u.Work, u.Pets, u.Food)
		if err != nil {
			return nil, err
		}
	}
	return users, nil
}

type seedListing struct {
	ID           string
	OwnerIdx     int    // index into users slice
	Title        string
	Description  string
	Rent         int
	Location     string
	PropertyType string
}

func seedListings(db *sql.DB, users []seedUser) ([]seedListing, error) {
	// User 0 (Rahul) owns the listings — he's the "broker/owner" persona.
	listings := []seedListing{
		{OwnerIdx: 0, Title: "2BHK in Koramangala", Description: "Furnished, near 80ft road. Looking for one working professional, non-smoker preferred.", Rent: 28000, Location: "Koramangala, Bengaluru", PropertyType: "flat"},
		{OwnerIdx: 0, Title: "Single room in HSR Layout", Description: "Quiet PG-style room in a 3BHK. Veg kitchen, no parties. Working professionals only.", Rent: 12000, Location: "HSR Layout, Bengaluru", PropertyType: "room"},
		{OwnerIdx: 0, Title: "Shared flat near Indiranagar metro", Description: "Looking for 3rd flatmate. Mixed gender, pet-friendly, balcony with plants.", Rent: 18000, Location: "Indiranagar, Bengaluru", PropertyType: "shared"},
		{OwnerIdx: 4, Title: "PG for women near Hitech City", Description: "All-female PG, includes meals, weekly cleaning. WiFi, parking.", Rent: 15000, Location: "Madhapur, Hyderabad", PropertyType: "pg"},
	}
	for i, l := range listings {
		var id string
		err := db.QueryRow(`
			INSERT INTO listings (user_id, title, description, rent, location, property_type, available_from)
			VALUES ($1,$2,$3,$4,$5,$6, CURRENT_DATE + INTERVAL '7 days')
			RETURNING id
		`, users[l.OwnerIdx].ID, l.Title, l.Description, l.Rent, l.Location, l.PropertyType).Scan(&id)
		if err != nil {
			return nil, err
		}
		listings[i].ID = id

		// PG details for the PG-type listing
		if l.PropertyType == "pg" {
			_, _ = db.Exec(`
				INSERT INTO pg_details (listing_id, sharing_type, meals, gender_preference)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (listing_id) DO NOTHING
			`, id, "single", "all_meals", "female")
		}
	}
	return listings, nil
}

func seedInterestsAndMatches(db *sql.DB, users []seedUser, listings []seedListing) error {
	// Priya (1) is interested in Rahul's 2BHK (0) — already accepted -> match
	if _, err := db.Exec(`
		INSERT INTO interests (sender_id, receiver_id, listing_id, status)
		VALUES ($1, $2, $3, 'accepted')
	`, users[1].ID, users[0].ID, listings[0].ID); err != nil {
		return err
	}
	if _, err := db.Exec(`
		INSERT INTO matches (user1_id, user2_id, listing_id)
		VALUES ($1, $2, $3)
	`, users[0].ID, users[1].ID, listings[0].ID); err != nil {
		return err
	}

	// Ankit (2) is interested in Rahul's HSR room (1) — pending
	if _, err := db.Exec(`
		INSERT INTO interests (sender_id, receiver_id, listing_id, status)
		VALUES ($1, $2, $3, 'pending')
	`, users[2].ID, users[0].ID, listings[1].ID); err != nil {
		return err
	}

	// Sneha (3) interested in shared flat (2) — pending
	if _, err := db.Exec(`
		INSERT INTO interests (sender_id, receiver_id, listing_id, status)
		VALUES ($1, $2, $3, 'pending')
	`, users[3].ID, users[0].ID, listings[2].ID); err != nil {
		return err
	}

	return nil
}

func seedMessages(db *sql.DB, users []seedUser, listings []seedListing) error {
	// Find the match between Rahul (0) and Priya (1) for listing[0]
	var matchID string
	err := db.QueryRow(`
		SELECT id FROM matches
		WHERE listing_id = $1 AND ((user1_id = $2 AND user2_id = $3) OR (user1_id = $3 AND user2_id = $2))
		LIMIT 1
	`, listings[0].ID, users[0].ID, users[1].ID).Scan(&matchID)
	if err != nil {
		return err
	}

	convo := []struct {
		FromIdx int
		Text    string
	}{
		{1, "Hi! Saw your 2BHK in Koramangala — looks great. Is the room still available?"},
		{0, "Hey Priya! Yes, available from next week. Want to come see it this weekend?"},
		{1, "Sure! Saturday afternoon works. What's the rent split — equal between flatmates?"},
		{0, "Yep, 14k each + utilities. Internet + cleaning is shared."},
		{1, "Sounds reasonable. I'll come around 3pm Saturday — what's the address?"},
	}
	for _, m := range convo {
		_, err := db.Exec(`
			INSERT INTO messages (match_id, sender_id, message, message_type, created_at)
			VALUES ($1, $2, $3, 'text', NOW() - INTERVAL '1 hour' * $4)
		`, matchID, users[m.FromIdx].ID, m.Text, len(convo)-len(m.Text)/100) // staggered times
		if err != nil {
			return err
		}
	}
	return nil
}

func seedReview(db *sql.DB, users []seedUser, listings []seedListing) error {
	// Priya leaves a review on Rahul's listing she matched with
	_, err := db.Exec(`
		INSERT INTO reviews (reviewer_id, listing_id, rating, comment)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (reviewer_id, listing_id) DO NOTHING
	`, users[1].ID, listings[0].ID, 5, "Rahul was responsive and the place is exactly as described. Would recommend.")
	return err
}

// Summary returns a human-readable description of what was seeded — useful
// for the seed CLI to print after a successful run.
func Summary() string {
	users := SeededUsers()
	var b strings.Builder
	b.WriteString("Seeded:\n")
	b.WriteString("  5 users with profiles:\n")
	for _, u := range users {
		b.WriteString(fmt.Sprintf("    %s  %s, %d (%s) — %s\n", u.Phone, u.Name, u.Age, u.Gender, u.Location))
	}
	b.WriteString("  4 listings (3 owned by Rahul in Bengaluru, 1 PG by Karthik in Hyderabad)\n")
	b.WriteString("  3 interests: 1 accepted (-> match), 2 pending\n")
	b.WriteString("  1 match (Rahul <-> Priya) with 5-message conversation\n")
	b.WriteString("  1 review (Priya -> Rahul's 2BHK, 5 stars)\n")
	b.WriteString("\nLog in via dev-login with any seeded phone, e.g. POST /auth/_dev-login {phone:\"" + users[0].Phone + "\"}\n")
	return b.String()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
