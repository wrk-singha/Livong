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
	"github.com/rohit/livong-backend/internal/review"
	"github.com/rohit/livong-backend/internal/plan"
	"github.com/rohit/livong-backend/internal/pg"
	"github.com/rohit/livong-backend/internal/rent"

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

	// Serve uploaded images
	router.Static("/uploads", "./uploads")

	// Public routes
	authHandler := auth.NewHandler(db)
	router.POST("/auth/login", authHandler.Login)
	router.POST("/auth/verify-otp", authHandler.VerifyOTP)

	// Dev-only OTP bypass — gated behind env var, refuses to load in production.
	if os.Getenv("LIVONG_DEV_LOGIN") == "1" {
		if os.Getenv("APP_ENV") == "production" || os.Getenv("NODE_ENV") == "production" {
			log.Fatal("LIVONG_DEV_LOGIN must NOT be set in production. Refusing to start.")
		}
		log.Println("⚠️  WARNING: dev-login enabled at POST /auth/_dev-login (no OTP). NEVER enable in production.")
		router.POST("/auth/_dev-login", authHandler.DevLogin)
	}

	// Protected routes — uses AuthWithDB so deleted accounts (DPDP soft-delete)
	// can't keep using a stale token from another device.
	protected := router.Group("/")
	protected.Use(middleware.AuthWithDB(db))
	{
		// Profile
		profileHandler := user.NewHandler(db)
		protected.GET("/profile", profileHandler.GetProfile)
		protected.POST("/profile", profileHandler.CreateProfile)
		protected.PATCH("/profile", profileHandler.UpdateProfile)
		protected.POST("/profile/avatar", profileHandler.UploadAvatar)
		protected.DELETE("/account", profileHandler.DeleteAccount)

		// Listings
		listingHandler := listing.NewHandler(db)
		protected.GET("/listings", listingHandler.GetListings)
		protected.GET("/listings/:id", listingHandler.GetListing)
		protected.POST("/listings", listingHandler.CreateListing)
		protected.POST("/listings/:id/images", listingHandler.UploadImages)

		// Interests
		interestHandler := interest.NewHandler(db)
		protected.POST("/interests", interestHandler.SendInterest)
		protected.GET("/interests/received", interestHandler.GetReceived)
		protected.PATCH("/interests/:id", interestHandler.UpdateInterest)

		// Matches
		matchHandler := match.NewHandler(db)
		protected.GET("/matches", matchHandler.GetMatches)

		// Messages
		chatHandler := chat.NewHandler(db)
		protected.GET("/messages/:matchId", chatHandler.GetMessages)
		protected.POST("/messages", chatHandler.SendMessage)
		protected.POST("/messages/share-contact", chatHandler.ShareContact)

		// Reviews
		reviewHandler := review.NewHandler(db)
		protected.POST("/reviews", reviewHandler.CreateReview)
		protected.GET("/reviews/listing/:listingId", reviewHandler.GetListingReviews)

		// Plans
		planHandler := plan.NewHandler(db)
		protected.GET("/plan", planHandler.GetPlan)
		protected.PATCH("/plan", planHandler.UpdatePlan)

		// PG Details
		pgHandler := pg.NewHandler(db)
		protected.PUT("/listings/:id/pg-details", pgHandler.Upsert)
		protected.GET("/listings/:id/pg-details", pgHandler.Get)

		// Rent
		rentHandler := rent.NewHandler(db)
		protected.POST("/rent-groups", rentHandler.CreateGroup)
		protected.GET("/rent-groups", rentHandler.GetGroups)
		protected.GET("/rent-groups/:id", rentHandler.GetGroup)
		protected.DELETE("/rent-groups/:id", rentHandler.DeleteGroup)
		protected.POST("/rent-groups/:id/members", rentHandler.AddMember)
		protected.DELETE("/rent-groups/:id/members/:userId", rentHandler.RemoveMember)
		protected.PATCH("/rent-groups/:id/members/:userId", rentHandler.UpdateMember)
		protected.GET("/rent-groups/:id/matched-users", rentHandler.GetMatchedUsers)
		protected.POST("/rent-groups/:id/payments", rentHandler.RecordPayment)
		protected.GET("/rent-groups/:id/payments", rentHandler.GetPayments)
		protected.PATCH("/rent-payments/:paymentId/verify", rentHandler.VerifyPayment)
		protected.GET("/rent-groups/:id/commissions", rentHandler.GetCommissions)
		protected.PATCH("/rent-commissions/:commissionId/collect", rentHandler.CollectCommission)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "6980"
	}

	log.Printf("Server starting on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
