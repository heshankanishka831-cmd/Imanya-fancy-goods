package middleware

import (
	"fmt"
	"net/http"

	"wholesale-management/internal/platform/logger"
	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get(RequestIDKey)
				logger.Log.Errorw("Panic recovered in HTTP handler",
					"request_id", requestID,
					"error", fmt.Sprintf("%v", err),
				)

				response.Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred. Please contact support.")
				c.Abort()
			}
		}()
		c.Next()
	}
}
