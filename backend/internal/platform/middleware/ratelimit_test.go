package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"distribution-management/internal/platform/middleware"

	"github.com/gin-gonic/gin"
)

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/otp", middleware.RateLimitMiddleware(2, time.Minute, "test-otp"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/otp", nil)
		req.RemoteAddr = "192.0.2.10:1234"
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 on request %d, got %d", i+1, w.Code)
		}
	}

	// 3rd request from same IP should be rate-limited
	reqBlocked := httptest.NewRequest(http.MethodPost, "/otp", nil)
	reqBlocked.RemoteAddr = "192.0.2.10:1234"
	wBlocked := httptest.NewRecorder()
	r.ServeHTTP(wBlocked, reqBlocked)
	if wBlocked.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 Too Many Requests, got %d", wBlocked.Code)
	}

	// Different IP should still be allowed
	reqOther := httptest.NewRequest(http.MethodPost, "/otp", nil)
	reqOther.RemoteAddr = "192.0.2.99:5555"
	wOther := httptest.NewRecorder()
	r.ServeHTTP(wOther, reqOther)
	if wOther.Code != http.StatusOK {
		t.Fatalf("expected 200 for separate IP, got %d", wOther.Code)
	}
}
