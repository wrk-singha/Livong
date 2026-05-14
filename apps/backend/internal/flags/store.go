// Package flags is an in-memory-cached store over the feature_flags table.
//
// Both backends (main API + admin API) read flags many times per request
// (middleware checks maintenance_mode on every hit). Caching avoids hammering
// the DB; the 5-second TTL is short enough that admin-panel toggles take
// effect promptly without a full SIGHUP/restart story.
package flags

import (
	"database/sql"
	"log"
	"sync"
	"time"
)

const cacheTTL = 5 * time.Second

// Known flag keys. Add new ones here AND in the migration seed.
const (
	MaintenanceMode      = "maintenance_mode"
	ChatEnabled          = "chat_enabled"
	RentEnabled          = "rent_enabled"
	InterestsEnabled     = "interests_enabled"
	CreateListingEnabled = "create_listing_enabled"
	ProfileDeleteEnabled = "profile_delete_enabled"
)

type Flag struct {
	Key         string    `json:"key"`
	Enabled     bool      `json:"enabled"`
	Description string    `json:"description,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Store struct {
	db        *sql.DB
	mu        sync.RWMutex
	cache     map[string]bool
	allCache  []Flag // ordered list for /flags response
	expiresAt time.Time
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db, cache: make(map[string]bool)}
}

// Enabled returns the flag value. Defaults to TRUE if the flag doesn't exist —
// new code paths that reference an unknown flag fail-open (better than silently
// hiding a feature because we forgot to insert a row).
func (s *Store) Enabled(key string) bool {
	s.refreshIfStale()
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.cache[key]
	if !ok {
		return true
	}
	return v
}

// All returns the full list of flags (for /flags + /admin/flags responses).
func (s *Store) All() []Flag {
	s.refreshIfStale()
	s.mu.RLock()
	defer s.mu.RUnlock()
	// Return a copy so callers can't mutate cache state.
	out := make([]Flag, len(s.allCache))
	copy(out, s.allCache)
	return out
}

// Set updates a flag and invalidates the cache so the next read reflects it.
// Returns the updated row.
func (s *Store) Set(key string, enabled bool) (*Flag, error) {
	var f Flag
	err := s.db.QueryRow(`
		UPDATE feature_flags SET enabled = $2, updated_at = NOW()
		WHERE key = $1
		RETURNING key, enabled, COALESCE(description,''), updated_at
	`, key, enabled).Scan(&f.Key, &f.Enabled, &f.Description, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	s.invalidate()
	return &f, nil
}

func (s *Store) refreshIfStale() {
	s.mu.RLock()
	stale := time.Now().After(s.expiresAt)
	s.mu.RUnlock()
	if !stale {
		return
	}
	s.reload()
}

func (s *Store) reload() {
	rows, err := s.db.Query(`SELECT key, enabled, COALESCE(description,''), updated_at FROM feature_flags ORDER BY key`)
	if err != nil {
		log.Printf("flags: reload failed: %v (keeping stale cache)", err)
		// Bump expiry so we don't hammer the DB if it's down — keep serving
		// the last-known cache instead of failing all requests.
		s.mu.Lock()
		s.expiresAt = time.Now().Add(cacheTTL)
		s.mu.Unlock()
		return
	}
	defer rows.Close()

	cache := make(map[string]bool)
	var all []Flag
	for rows.Next() {
		var f Flag
		if err := rows.Scan(&f.Key, &f.Enabled, &f.Description, &f.UpdatedAt); err != nil {
			continue
		}
		cache[f.Key] = f.Enabled
		all = append(all, f)
	}

	s.mu.Lock()
	s.cache = cache
	s.allCache = all
	s.expiresAt = time.Now().Add(cacheTTL)
	s.mu.Unlock()
}

func (s *Store) invalidate() {
	s.mu.Lock()
	s.expiresAt = time.Time{} // forces reload on next read
	s.mu.Unlock()
}
