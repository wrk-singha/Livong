package rent

import (
	"database/sql"
	"regexp"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

var monthRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

// isMember checks if user belongs to a rent group
func (h *Handler) isMember(groupID, userID string) bool {
	var exists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM rent_members WHERE rent_group_id = $1 AND user_id = $2)`, groupID, userID).Scan(&exists)
	return exists
}
