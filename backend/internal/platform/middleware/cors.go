package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		isAllowed := false
		for _, o := range allowedOrigins {
			if strings.TrimSpace(o) == "*" || strings.TrimSpace(o) == origin {
				isAllowed = true
				break
			}
		}

		if isAllowed && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if len(allowedOrigins) > 0 && strings.TrimSpace(allowedOrigins[0]) == "*" {
			c.Header("Access-Control-Allow-Origin", "*")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Request-ID, X-Session-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Length, X-Request-ID")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
