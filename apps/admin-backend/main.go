package main

import (
	"log"
	"os"

	"github.com/rohit/livong-admin-backend/internal/admin"
	"github.com/rohit/livong-admin-backend/internal/auth"
	"github.com/rohit/livong-admin-backend/internal/database"
	"github.com/rohit/livong-admin-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	router := gin.Default()

	router.Use(middleware.CORS())

	// Auth routes (admin login uses the same OTP flow)
	authHandler := auth.NewHandler(db)
	router.POST("/auth/login", authHandler.Login)
	router.POST("/auth/verify-otp", authHandler.VerifyOTP)

	// Dev-only OTP bypass for admin testing — gated. Refuses to load in production.
	if os.Getenv("LIVONG_DEV_LOGIN") == "1" {
		if os.Getenv("APP_ENV") == "production" || os.Getenv("NODE_ENV") == "production" {
			log.Fatal("LIVONG_DEV_LOGIN must NOT be set in production. Refusing to start.")
		}
		log.Println("⚠️  WARNING: admin dev-login enabled at POST /auth/_dev-login (no OTP). NEVER enable in production.")
		router.POST("/auth/_dev-login", authHandler.DevLogin)
	}

	// Admin routes
	adminHandler := admin.NewHandler(db)
	adminGroup := router.Group("/admin")
	adminGroup.Use(admin.AdminAuth(db))
	{
		adminGroup.GET("/stats", adminHandler.GetStats)
		adminGroup.GET("/users", adminHandler.GetUsers)
		adminGroup.PATCH("/users/:id", adminHandler.UpdateUser)
		adminGroup.DELETE("/users/:id", adminHandler.DeleteUser)
		adminGroup.GET("/listings", adminHandler.GetListings)
		adminGroup.DELETE("/listings/:id", adminHandler.DeleteListing)
		adminGroup.GET("/reviews", adminHandler.GetReviews)
		adminGroup.DELETE("/reviews/:id", adminHandler.DeleteReview)
		adminGroup.GET("/matches", adminHandler.GetMatches)
		adminGroup.GET("/interests", adminHandler.GetInterests)
		adminGroup.GET("/revenue", adminHandler.GetRevenue)
		adminGroup.GET("/analytics", adminHandler.GetAnalytics)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Admin server starting on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start admin server: %v", err)
	}
}
