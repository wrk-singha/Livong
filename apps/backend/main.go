package main

import (
	"log"
	"os"

	"github.com/rohit/livong-backend/internal/auth"
	"github.com/rohit/livong-backend/internal/block"
	"github.com/rohit/livong-backend/internal/chat"
	"github.com/rohit/livong-backend/internal/database"
	"github.com/rohit/livong-backend/internal/flags"
	"github.com/rohit/livong-backend/internal/interest"
	"github.com/rohit/livong-backend/internal/listing"
	"github.com/rohit/livong-backend/internal/match"
	"github.com/rohit/livong-backend/internal/middleware"
	"github.com/rohit/livong-backend/internal/pg"
	"github.com/rohit/livong-backend/internal/plan"
	"github.com/rohit/livong-backend/internal/rent"
	"github.com/rohit/livong-backend/internal/report"
	"github.com/rohit/livong-backend/internal/review"
	"github.com/rohit/livong-backend/internal/user"
	"github.com/rohit/livong-backend/internal/ws"

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

	// WebSocket infra — single in-process hub. When we add a 2nd VM, swap
	// in-handler hub.Broadcast for pg_notify + a LISTEN goroutine in this
	// package; no API surface change. See internal/ws/hub.go.
	wsHub := ws.NewHub()
	wsTickets := ws.NewTicketStore()

	// Feature flags — admin-toggleable kill switches with 5s cache.
	flagStore := flags.NewStore(db)
	flagHandler := flags.NewHandler(flagStore)

	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORS())

	// Maintenance-mode gate. Runs before everything else. Exempt routes (auth,
	// flags read, ws ticket exchange) stay alive so admins can flip it off
	// and users can finish in-progress logins.
	router.Use(flags.MaintenanceMiddleware(flagStore, map[string]bool{
		"/auth/login":      true,
		"/auth/verify-otp": true,
		"/auth/_dev-login": true,
		"/flags":           true,
		"/chat/ws":         true, // WS connect must work to receive maintenance state
	}))

	// Public flags endpoint — frontend hits this on boot to gate UI.
	router.GET("/flags", flagHandler.GetFlags)

	// Serve uploaded images
	router.Static("/uploads", "./uploads")

	// WebSocket accept — public route (auth via single-use ticket in query).
	// Browsers can't set Authorization on a WS open; ticket pattern is the
	// modern alternative to JWT-in-URL. See internal/ws/ticket.go.
	wsHandler := ws.NewHandler(wsHub, wsTickets, db)
	router.GET("/chat/ws", wsHandler.Accept)

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
		protected.DELETE("/account", flags.Guard(flagStore, flags.ProfileDeleteEnabled), profileHandler.DeleteAccount)

		// Listings — reads are always on; only NEW listings gate behind the flag.
		listingHandler := listing.NewHandler(db)
		protected.GET("/listings", listingHandler.GetListings)
		protected.GET("/listings/:id", listingHandler.GetListing)
		protected.POST("/listings", flags.Guard(flagStore, flags.CreateListingEnabled), listingHandler.CreateListing)
		protected.POST("/listings/:id/images", flags.Guard(flagStore, flags.CreateListingEnabled), listingHandler.UploadImages)

		// Interests — gate sending; reading received interests stays on so
		// owners can clear their inbox even while sending is paused.
		interestHandler := interest.NewHandler(db)
		protected.POST("/interests", flags.Guard(flagStore, flags.InterestsEnabled), interestHandler.SendInterest)
		protected.GET("/interests/received", interestHandler.GetReceived)
		protected.PATCH("/interests/:id", interestHandler.UpdateInterest)

		// Reports + blocks (safety primitives — UI in a follow-up sprint)
		reportHandler := report.NewHandler(db)
		protected.POST("/reports", reportHandler.Create)

		blockHandler := block.NewHandler(db)
		protected.POST("/blocks", blockHandler.Create)
		protected.DELETE("/blocks/:userId", blockHandler.Delete)
		protected.GET("/blocks", blockHandler.List)

		// Matches
		matchHandler := match.NewHandler(db)
		protected.GET("/matches", matchHandler.GetMatches)

		// Messages — gate writes; reads stay on so users can see history of a
		// conversation while sending is paused.
		chatHandler := chat.NewHandler(db, wsHub)
		protected.GET("/messages/:matchId", chatHandler.GetMessages)
		protected.POST("/messages", flags.Guard(flagStore, flags.ChatEnabled), chatHandler.SendMessage)
		protected.POST("/messages/share-contact", flags.Guard(flagStore, flags.ChatEnabled), chatHandler.ShareContact)

		// WS ticket — issue behind normal JWT middleware. Client immediately
		// opens GET /chat/ws?ticket=<token> with the returned token.
		protected.POST("/chat/ws-ticket", wsHandler.IssueTicket)

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

		// Rent — gate the whole sub-API behind one flag. Reads + writes both
		// blocked when rent_enabled=false (testers don't need partial access).
		rentGroup := protected.Group("/", flags.Guard(flagStore, flags.RentEnabled))
		rentHandler := rent.NewHandler(db)
		rentGroup.POST("/rent-groups", rentHandler.CreateGroup)
		rentGroup.GET("/rent-groups", rentHandler.GetGroups)
		rentGroup.GET("/rent-groups/:id", rentHandler.GetGroup)
		rentGroup.DELETE("/rent-groups/:id", rentHandler.DeleteGroup)
		rentGroup.POST("/rent-groups/:id/members", rentHandler.AddMember)
		rentGroup.DELETE("/rent-groups/:id/members/:userId", rentHandler.RemoveMember)
		rentGroup.PATCH("/rent-groups/:id/members/:userId", rentHandler.UpdateMember)
		rentGroup.GET("/rent-groups/:id/matched-users", rentHandler.GetMatchedUsers)
		rentGroup.POST("/rent-groups/:id/payments", rentHandler.RecordPayment)
		rentGroup.GET("/rent-groups/:id/payments", rentHandler.GetPayments)
		rentGroup.PATCH("/rent-payments/:paymentId/verify", rentHandler.VerifyPayment)
		rentGroup.GET("/rent-groups/:id/commissions", rentHandler.GetCommissions)
		rentGroup.PATCH("/rent-commissions/:commissionId/collect", rentHandler.CollectCommission)
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
