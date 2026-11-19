package middleware

import (
	"errors"
	"strings"

	"wholesale-management/internal/platform/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	ContextUserIDKey   = "current_user_id"
	ContextRoleIDKey   = "current_role_id"
	ContextRoleNameKey = "current_role_name"
	ContextEmailKey    = "current_email"
)

type JWTClaims struct {
	UserID   string `json:"user_id"`
	RoleID   int    `json:"role_id"`
	RoleName string `json:"role_name"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "Invalid authorization header format. Expected 'Bearer <token>'")
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims, err := ParseToken(tokenStr, jwtSecret)
		if err != nil {
			response.Unauthorized(c, "Invalid, expired, or malformed authentication token")
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextRoleIDKey, claims.RoleID)
		c.Set(ContextRoleNameKey, claims.RoleName)
		c.Set(ContextEmailKey, claims.Email)

		c.Next()
	}
}

func OptionalAuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				if claims, err := ParseToken(parts[1], jwtSecret); err == nil {
					c.Set(ContextUserIDKey, claims.UserID)
					c.Set(ContextRoleIDKey, claims.RoleID)
					c.Set(ContextRoleNameKey, claims.RoleName)
					c.Set(ContextEmailKey, claims.Email)
				}
			}
		}
		c.Next()
	}
}

func ParseToken(tokenString, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}

func GetCurrentUserID(c *gin.Context) string {
	if val, ok := c.Get(ContextUserIDKey); ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func GetCurrentRoleName(c *gin.Context) string {
	if val, ok := c.Get(ContextRoleNameKey); ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}
