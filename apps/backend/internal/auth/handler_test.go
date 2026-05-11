package auth

import (
	"strings"
	"testing"
)

func TestPhoneRegex(t *testing.T) {
	cases := []struct {
		phone string
		ok    bool
	}{
		{"+919876543210", true},
		{"919876543210", true},
		{"+1234567", true},
		{"+12345678901234", true},
		{"123456", false},  // too short (< 7 digits after country)
		{"+0123456789", false}, // leading 0 after +
		{"+12345678901234567", false}, // too long
		{"abc", false},
		{"", false},
		{"+91 9876543210", false}, // space
		{"+91-9876543210", false}, // dash
	}
	for _, c := range cases {
		got := phoneRegex.MatchString(c.phone)
		if got != c.ok {
			t.Errorf("phoneRegex(%q) = %v, want %v", c.phone, got, c.ok)
		}
	}
}

func TestGenerateOTP(t *testing.T) {
	for i := 0; i < 100; i++ {
		otp, err := generateOTP()
		if err != nil {
			t.Fatalf("generateOTP error: %v", err)
		}
		if len(otp) != 6 {
			t.Errorf("OTP length = %d, want 6 (got %q)", len(otp), otp)
		}
		for _, r := range otp {
			if r < '0' || r > '9' {
				t.Errorf("OTP %q contains non-digit", otp)
			}
		}
	}
}

func TestHashOTPDeterministic(t *testing.T) {
	a := hashOTP("123456")
	b := hashOTP("123456")
	if a != b {
		t.Error("hashOTP not deterministic for same input")
	}
	c := hashOTP("123457")
	if a == c {
		t.Error("hashOTP collision for different inputs")
	}
	if len(a) != 64 {
		t.Errorf("hashOTP length = %d, want 64 hex chars", len(a))
	}
}

func TestTokenRoundtrip(t *testing.T) {
	tok, err := GenerateToken("user-abc")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	if !strings.HasPrefix(tok, "ey") {
		t.Errorf("token doesn't look like JWT: %q", tok[:min(20, len(tok))])
	}

	claims, err := ValidateToken(tok)
	if err != nil {
		t.Fatalf("ValidateToken: %v", err)
	}
	if claims.UserID != "user-abc" {
		t.Errorf("UserID = %q, want user-abc", claims.UserID)
	}
}

func TestValidateTokenRejectsBadInput(t *testing.T) {
	cases := []string{
		"",
		"not-a-jwt",
		"ey.bad.token",
		"a.b.c",
	}
	for _, tok := range cases {
		if _, err := ValidateToken(tok); err == nil {
			t.Errorf("ValidateToken(%q) = nil error, want error", tok)
		}
	}
}

func TestValidateTokenRejectsWrongSignature(t *testing.T) {
	tok, err := GenerateToken("u1")
	if err != nil {
		t.Fatal(err)
	}
	// Tamper with last char
	tampered := tok[:len(tok)-1] + "X"
	if tampered == tok {
		tampered = tok[:len(tok)-1] + "Y"
	}
	if _, err := ValidateToken(tampered); err == nil {
		t.Error("ValidateToken accepted tampered token")
	}
}
