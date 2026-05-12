package interest

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// openDBOrSkip connects to local Postgres or skips. CI without DB stays green.
func openDBOrSkip(t *testing.T) *sql.DB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("postgres", url)
	if err != nil {
		t.Skipf("db open: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("db unreachable: %v", err)
	}
	return db
}

func randPhone() string {
	b := make([]byte, 6)
	f, _ := os.Open("/dev/urandom")
	defer f.Close()
	f.Read(b)
	return fmt.Sprintf("t%x", b)[:13] // VARCHAR(15)
}

// seedTriad inserts owner, sender, listing, pending interest. Returns ids + cleanup.
func seedTriad(t *testing.T, db *sql.DB) (ownerID, senderID, listingID, interestID string, cleanup func()) {
	t.Helper()
	owner := randPhone()
	sender := randPhone()
	if err := db.QueryRow(`INSERT INTO users (phone) VALUES ($1) RETURNING id`, owner).Scan(&ownerID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO users (phone) VALUES ($1) RETURNING id`, sender).Scan(&senderID); err != nil {
		t.Fatal(err)
	}
	// Profile for sender so the join in GetReceived returns name/age/etc.
	if _, err := db.Exec(`INSERT INTO profiles (user_id, name, age, gender, location) VALUES ($1, 'Test Sender', 28, 'female', 'Pune')`, senderID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO listings (user_id, title, description, rent, location, property_type) VALUES ($1, 'Test Listing', 'desc', 15000, 'TestCity', 'flat') RETURNING id`, ownerID).Scan(&listingID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO interests (sender_id, receiver_id, listing_id, status) VALUES ($1, $2, $3, 'pending') RETURNING id`, senderID, ownerID, listingID).Scan(&interestID); err != nil {
		t.Fatal(err)
	}
	return ownerID, senderID, listingID, interestID, func() {
		db.Exec(`DELETE FROM interests WHERE id = $1`, interestID)
		db.Exec(`DELETE FROM listings WHERE id = $1`, listingID)
		db.Exec(`DELETE FROM profiles WHERE user_id = $1`, senderID)
		db.Exec(`DELETE FROM users WHERE id IN ($1, $2)`, ownerID, senderID)
	}
}

func TestGetReceived_ReturnsPendingForReceiver(t *testing.T) {
	db := openDBOrSkip(t)
	defer db.Close()
	ownerID, _, _, interestID, cleanup := seedTriad(t, db)
	defer cleanup()

	h := &Handler{db: db}
	r := gin.New()
	r.GET("/interests/received", func(c *gin.Context) {
		c.Set("userId", ownerID)
		h.GetReceived(c)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/interests/received", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body=%s", w.Code, w.Body.String())
	}

	var got []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatalf("expected at least 1 interest, got 0")
	}
	// Find our seeded interest
	var found bool
	for _, item := range got {
		if item["id"] == interestID {
			found = true
			if item["senderName"] != "Test Sender" {
				t.Errorf("senderName = %v, want 'Test Sender'", item["senderName"])
			}
			if item["listingTitle"] != "Test Listing" {
				t.Errorf("listingTitle = %v, want 'Test Listing'", item["listingTitle"])
			}
			break
		}
	}
	if !found {
		t.Errorf("seeded interest %s not in response", interestID)
	}
}

func TestGetReceived_DoesNotReturnAcceptedOrRejected(t *testing.T) {
	db := openDBOrSkip(t)
	defer db.Close()
	ownerID, _, _, interestID, cleanup := seedTriad(t, db)
	defer cleanup()

	// Mark the seeded interest as accepted
	if _, err := db.Exec(`UPDATE interests SET status = 'accepted' WHERE id = $1`, interestID); err != nil {
		t.Fatal(err)
	}

	h := &Handler{db: db}
	r := gin.New()
	r.GET("/interests/received", func(c *gin.Context) {
		c.Set("userId", ownerID)
		h.GetReceived(c)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/interests/received", nil)
	r.ServeHTTP(w, req)

	var got []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	for _, item := range got {
		if item["id"] == interestID {
			t.Errorf("accepted interest %s should NOT appear in inbox, but did", interestID)
		}
	}
}

func TestGetReceived_DoesNotReturnInterestsForOtherUsers(t *testing.T) {
	db := openDBOrSkip(t)
	defer db.Close()
	_, _, _, interestID, cleanup := seedTriad(t, db)
	defer cleanup()

	// Query as a totally different user (random uuid)
	otherUser := randPhone()
	var otherID string
	if err := db.QueryRow(`INSERT INTO users (phone) VALUES ($1) RETURNING id`, otherUser).Scan(&otherID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(`DELETE FROM users WHERE id = $1`, otherID)

	h := &Handler{db: db}
	r := gin.New()
	r.GET("/interests/received", func(c *gin.Context) {
		c.Set("userId", otherID)
		h.GetReceived(c)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/interests/received", nil)
	r.ServeHTTP(w, req)

	var got []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	for _, item := range got {
		if item["id"] == interestID {
			t.Errorf("user %s should not see interest %s addressed to someone else", otherID, interestID)
		}
	}
}
