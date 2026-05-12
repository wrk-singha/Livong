// Local-only command to seed test data. Refuses to run in production.
//
// Usage:
//   cd apps/backend && go run ./cmd/seed
// Or via the project CLI:
//   ./livong seed
package main

import (
	"log"
	"os"

	"github.com/rohit/livong-backend/internal/database"
	"github.com/rohit/livong-backend/internal/seed"
)

func main() {
	if os.Getenv("APP_ENV") == "production" || os.Getenv("NODE_ENV") == "production" {
		log.Fatal("seed must NOT run in production. Refusing.")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	if err := seed.Run(db); err != nil {
		log.Fatalf("seed: %v", err)
	}

	log.Println(seed.Summary())
}
