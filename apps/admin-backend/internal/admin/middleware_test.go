package admin

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rohit/livong-admin-backend/internal/auth"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newRouter builds a router with AdminAuth installed and a /ping handler that
// echoes the userId set by the middleware. The db arg is allowed to be nil for
// tests whose request shouldn't reach the db query (header / token failures).
func newRouter(db *sql.DB) *gin.Engine {
	r := gin.New()
	r.Use(AdminAuth(db))
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"userId": c.GetString("userId")})
	})
	return r
}

func TestAdminAuth_RejectsMissingHeader(t *testing.T) {
	r := newRouter(nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestAdminAuth_RejectsMalformedHeader(t *testing.T) {
	r := newRouter(nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Authorization", "Token abc.def.ghi") // missing "Bearer " prefix
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestAdminAuth_RejectsInvalidToken(t *testing.T) {
	r := newRouter(nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-jwt")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestAdminAuth_RejectsTamperedToken(t *testing.T) {
	tok, err := auth.GenerateToken("some-user-id")
	if err != nil {
		t.Fatal(err)
	}
	tampered := tok[:len(tok)-1] + "X"
	if tampered == tok {
		tampered = tok[:len(tok)-1] + "Y"
	}

	r := newRouter(nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Authorization", "Bearer "+tampered)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("tampered token: status = %d, want 401", w.Code)
	}
}

// --- DB-backed tests ---
//
// These need a Postgres reachable via DATABASE_URL (or the project's default).
// They auto-skip when no DB is reachable so the suite stays green in CI
// environments that don't provision Postgres.

func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	// Lazy import to avoid making the no-DB tests depend on the database package.
	db, err := openDBFromEnv()
	if err != nil {
		t.Skipf("skipping DB-backed test: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("skipping: db unreachable (%v)", err)
	}
	return db
}

func TestAdminAuth_RejectsNonAdminUser(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	userID, cleanup := seedUser(t, db, false)
	defer cleanup()

	tok, err := auth.GenerateToken(userID)
	if err != nil {
		t.Fatal(err)
	}

	r := newRouter(db)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("non-admin: status = %d, want 403", w.Code)
	}
}

func TestAdminAuth_AllowsAdminUser(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	userID, cleanup := seedUser(t, db, true)
	defer cleanup()

	tok, err := auth.GenerateToken(userID)
	if err != nil {
		t.Fatal(err)
	}

	r := newRouter(db)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("admin: status = %d, want 200, body=%s", w.Code, w.Body.String())
	}
}
