package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"regexp"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Handler struct {
	db *sql.DB
}

type Claims struct {
	UserID string `json:"userId"`
	jwt.RegisteredClaims
}

var (
	otpMu    sync.Mutex
	otpStore = make(map[string]otpEntry)
	rateMu       sync.Mutex
	rateAttempts = make(map[string]rateEntry)
	loginRateMu    sync.Mutex
	loginRateStore = make(map[string]rateEntry)
	phoneRegex     = regexp.MustCompile(`^\+?[1-9]\d{6,14}$`)
)

type otpEntry struct {
	Code      string
	ExpiresAt time.Time
}

type rateEntry struct {
	Count     int
	ResetAt   time.Time
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	if !phoneRegex.MatchString(req.Phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid phone number format"})
		return
	}

	// Rate limit OTP requests: max 3 per 15 minutes per phone
	loginRateMu.Lock()
	lr := loginRateStore[req.Phone]
	if time.Now().After(lr.ResetAt) {
		lr = rateEntry{Count: 0, ResetAt: time.Now().Add(15 * time.Minute)}
	}
	lr.Count++
	loginRateStore[req.Phone] = lr
	loginRateMu.Unlock()

	if lr.Count > 3 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many OTP requests, try again later"})
		return
	}

	// Generate OTP
	otp, err := generateOTP()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate OTP"})
		return
	}

	fmt.Printf("[DEV] OTP for %s: %s\n", req.Phone, otp)

	// Store hashed OTP
	otpMu.Lock()
	otpStore[req.Phone] = otpEntry{
		Code:      hashOTP(otp),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	otpMu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP sent",
	})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		OTP   string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone and otp are required"})
		return
	}

	// Verify OTP (compare hashed)
	otpMu.Lock()
	entry, exists := otpStore[req.Phone]
	if !exists || entry.Code != hashOTP(req.OTP) || time.Now().After(entry.ExpiresAt) {
		otpMu.Unlock()

		// Rate limiting: track failed attempts
		rateMu.Lock()
		re := rateAttempts[req.Phone]
		if time.Now().After(re.ResetAt) {
			re = rateEntry{Count: 0, ResetAt: time.Now().Add(15 * time.Minute)}
		}
		re.Count++
		rateAttempts[req.Phone] = re
		rateMu.Unlock()

		if re.Count > 5 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts, try again later"})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired OTP"})
		return
	}
	delete(otpStore, req.Phone)
	otpMu.Unlock()

	// Clear rate limit on success
	rateMu.Lock()
	delete(rateAttempts, req.Phone)
	rateMu.Unlock()

	// Find or create user
	var userID string
	err := h.db.QueryRow("SELECT id FROM users WHERE phone = $1", req.Phone).Scan(&userID)
	if err == sql.ErrNoRows {
		err = h.db.QueryRow("INSERT INTO users (phone) VALUES ($1) RETURNING id", req.Phone).Scan(&userID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process user"})
		return
	}

	// Generate JWT
	token, err := GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"userId": userID,
		"token":  token,
	})
}

// DevLogin bypasses OTP for local testing. ONLY register this route when
// LIVONG_DEV_LOGIN=1 is set — see main.go. Returns a JWT for the given phone,
// creating the user if needed. Same response shape as VerifyOTP.
func (h *Handler) DevLogin(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	if !phoneRegex.MatchString(req.Phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid phone number format"})
		return
	}

	var userID string
	err := h.db.QueryRow("SELECT id FROM users WHERE phone = $1", req.Phone).Scan(&userID)
	if err == sql.ErrNoRows {
		err = h.db.QueryRow("INSERT INTO users (phone) VALUES ($1) RETURNING id", req.Phone).Scan(&userID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process user"})
		return
	}

	token, err := GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"userId": userID, "token": token})
}

func GenerateToken(userID string) (string, error) {
	secret := getJWTSecret()

	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "livong",
			Audience:  jwt.ClaimStrings{"livong-api"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr string) (*Claims, error) {
	secret := getJWTSecret()

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	}, jwt.WithIssuer("livong"), jwt.WithAudience("livong-api"))
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func hashOTP(otp string) string {
	h := sha256.Sum256([]byte(otp))
	return hex.EncodeToString(h[:])
}

var jwtSecret string

func init() {
	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("WARNING: JWT_SECRET not set, using insecure default. Set JWT_SECRET in production!")
		jwtSecret = "dev-secret-change-me"
	}
}

func getJWTSecret() string {
	return jwtSecret
}
