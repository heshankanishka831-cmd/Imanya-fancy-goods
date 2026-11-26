package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type slidingWindowLimiter struct {
	mu      sync.Mutex
	buckets map[string][]time.Time
	limit   int
	window  time.Duration
}

func newSlidingWindowLimiter(limit int, window time.Duration) *slidingWindowLimiter {
	return &slidingWindowLimiter{
		buckets: make(map[string][]time.Time),
		limit:   limit,
		window:  window,
	}
}

func (l *slidingWindowLimiter) allow(key string, now time.Time) (bool, int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := now.Add(-l.window)
	history := l.buckets[key]
	pruned := history[:0]
	for _, ts := range history {
		if ts.After(cutoff) {
			pruned = append(pruned, ts)
		}
	}

	if len(pruned) >= l.limit {
		l.buckets[key] = pruned
		retryAfter := int(l.window.Seconds() - now.Sub(pruned[0]).Seconds())
		if retryAfter < 1 {
			retryAfter = 1
		}
		return false, retryAfter
	}

	pruned = append(pruned, now)
	l.buckets[key] = pruned
	return true, 0
}

// RateLimitMiddleware limits requests per client IP within a sliding time window
func RateLimitMiddleware(maxRequests int, window time.Duration, scope string) gin.HandlerFunc {
	limiter := newSlidingWindowLimiter(maxRequests, window)

	return func(c *gin.Context) {
		key := fmt.Sprintf("%s:%s", scope, c.ClientIP())
		allowed, retryAfter := limiter.allow(key, time.Now().UTC())
		if !allowed {
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			response.Error(
				c,
				http.StatusTooManyRequests,
				"RATE_LIMITED",
				fmt.Sprintf("Too many requests. Please wait %d seconds before trying again.", retryAfter),
				gin.H{"retry_after_seconds": retryAfter},
			)
			c.Abort()
			return
		}
		c.Next()
	}
}
