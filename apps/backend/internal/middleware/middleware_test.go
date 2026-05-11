package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newRouter() *gin.Engine {
	r := gin.New()
	r.Use(CORS())
	r.GET("/ping", func(c *gin.Context) { c.String(200, "ok") })
	return r
}

func TestCORS_AllowsLocalhostOrigin(t *testing.T) {
	os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	r.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("ACAO = %q, want http://localhost:3000", got)
	}
}

func TestCORS_AllowsPrivateIPInDevDefault(t *testing.T) {
	os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	cases := []string{
		"http://192.168.1.16:3000",
		"http://192.168.0.1:8080",
		"http://10.0.0.5:3000",
		"http://172.16.5.5:3000",
		"http://172.31.255.255:8080",
	}
	for _, origin := range cases {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/ping", nil)
		req.Header.Set("Origin", origin)
		r.ServeHTTP(w, req)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != origin {
			t.Errorf("origin %q: ACAO = %q, want %q", origin, got, origin)
		}
	}
}

func TestCORS_BlocksPublicIPInDevDefault(t *testing.T) {
	os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	cases := []string{
		"http://1.2.3.4:3000",
		"http://example.com",
		"http://172.15.0.1:3000",   // outside 16-31 range
		"http://172.32.0.1:3000",   // outside 16-31 range
		"http://192.169.1.1:3000",  // typo of 192.168
		"https://192.168.1.1:3000", // https not http
	}
	for _, origin := range cases {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/ping", nil)
		req.Header.Set("Origin", origin)
		r.ServeHTTP(w, req)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("origin %q: ACAO = %q, want empty", origin, got)
		}
	}
}

func TestCORS_ProdConfigDoesNotAllowPrivateIP(t *testing.T) {
	os.Setenv("CORS_ORIGINS", "https://livong.app,https://www.livong.app")
	defer os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	// private IP must NOT be allowed when CORS_ORIGINS is set explicitly
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Origin", "http://192.168.1.16:3000")
	r.ServeHTTP(w, req)
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("private IP in prod: ACAO = %q, want empty", got)
	}

	// configured origin IS allowed
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/ping", nil)
	req.Header.Set("Origin", "https://livong.app")
	r.ServeHTTP(w, req)
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://livong.app" {
		t.Errorf("prod origin: ACAO = %q, want https://livong.app", got)
	}
}

func TestCORS_OptionsPreflight(t *testing.T) {
	os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("OPTIONS", "/ping", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Errorf("OPTIONS status = %d, want 204", w.Code)
	}
}

func TestCORS_SecurityHeadersPresent(t *testing.T) {
	os.Unsetenv("CORS_ORIGINS")
	r := newRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/ping", nil)
	r.ServeHTTP(w, req)

	required := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "strict-origin-when-cross-origin",
	}
	for k, want := range required {
		if got := w.Header().Get(k); got != want {
			t.Errorf("%s = %q, want %q", k, got, want)
		}
	}
}
