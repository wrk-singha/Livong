package admin

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// openDBFromEnv mirrors database.Connect's behavior at the env level so tests
// can connect without importing the full database package (which would re-run
// migrations on every test). Skip the test if no env or unreachable.
func openDBFromEnv() (*sql.DB, error) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}
	return sql.Open("postgres", url)
}

// seedUser inserts a user with a unique phone (so tests can run in parallel
// against the same DB), optionally as an admin. Returns the user id and a
// cleanup that hard-deletes the row.
func seedUser(t *testing.T, db *sql.DB, isAdmin bool) (string, func()) {
	t.Helper()

	// Unique phone per test (must fit users.phone VARCHAR(15)).
	phone := "t" + randSuffix()

	var id string
	err := db.QueryRow(
		`INSERT INTO users (phone, is_admin) VALUES ($1, $2) RETURNING id`,
		phone, isAdmin,
	).Scan(&id)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	return id, func() {
		_, _ = db.Exec(`DELETE FROM users WHERE id = $1`, id)
	}
}

func randSuffix() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	f, err := os.Open("/dev/urandom")
	if err != nil {
		// Fallback — good enough for test uniqueness.
		return fmt.Sprintf("%x", os.Getpid())
	}
	defer f.Close()
	_, _ = f.Read(b)
	for i, x := range b {
		b[i] = chars[int(x)%len(chars)]
	}
	return string(b)
}
