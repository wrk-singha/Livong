package main

import (
	"log"
	"os"

	"github.com/rohit/livong-backend/internal/database"
	"github.com/rohit/livong-backend/internal/middleware"
	"github.com/rohit/livong-backend/internal/auth"
	"github.com/rohit/livong-backend/internal/user"
	"github.com/rohit/livong-backend/internal/listing"
	"github.com/rohit/livong-backend/internal/interest"
	"github.com/rohit/livong-backend/internal/match"
	"github.com/rohit/livong-backend/internal/chat"

	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORS())

	// Public routes
	authHandler := auth.NewHandler(db)
	router.POST("/auth/login", authHandler.Login)
	router.POST("/auth/verify-otp", authHandler.VerifyOTP)

	// Protected routes
	protected := router.Group("/")
	protected.Use(middleware.Auth())
	{
		// Profile
		profileHandler := user.NewHandler(db)
		protected.GET("/profile", profileHandler.GetProfile)
		protected.POST("/profile", profileHandler.CreateProfile)
		protected.PATCH("/profile", profileHandler.UpdateProfile)

		// Listings
		listingHandler := listing.NewHandler(db)
		protected.GET("/listings", listingHandler.GetListings)
		protected.GET("/listings/:id", listingHandler.GetListing)
		protected.POST("/listings", listingHandler.CreateListing)

		// Interests
		interestHandler := interest.NewHandler(db)
		protected.POST("/interests", interestHandler.SendInterest)
		protected.PATCH("/interests/:id", interestHandler.UpdateInterest)

		// Matches
		matchHandler := match.NewHandler(db)
		protected.GET("/matches", matchHandler.GetMatches)

		// Messages
		chatHandler := chat.NewHandler(db)
		protected.GET("/messages/:matchId", chatHandler.GetMessages)
		protected.POST("/messages", chatHandler.SendMessage)
		protected.POST("/messages/share-contact", chatHandler.ShareContact)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
