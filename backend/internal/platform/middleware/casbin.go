package middleware

import (
	"fmt"

	"wholesale-management/internal/platform/response"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CasbinService struct {
	Enforcer *casbin.Enforcer
}

const rbacModelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && (r.act == p.act || p.act == "*") || r.sub == "Super Administrator"
`

func InitCasbin(db *gorm.DB) (*CasbinService, error) {
	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, fmt.Errorf("failed to create casbin gorm adapter: %w", err)
	}

	m, err := model.NewModelFromString(rbacModelText)
	if err != nil {
		return nil, fmt.Errorf("failed to parse casbin model text: %w", err)
	}

	enforcer, err := casbin.NewEnforcer(m, adapter)
	if err != nil {
		return nil, fmt.Errorf("failed to create casbin enforcer: %w", err)
	}

	if err := enforcer.LoadPolicy(); err != nil {
		return nil, fmt.Errorf("failed to load casbin policies: %w", err)
	}

	return &CasbinService{Enforcer: enforcer}, nil
}

func (cs *CasbinService) EnforceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleName := GetCurrentRoleName(c)
		if roleName == "" {
			response.Unauthorized(c, "Authentication required for this resource")
			c.Abort()
			return
		}

		path := c.Request.URL.Path
		method := c.Request.Method

		allowed, err := cs.Enforcer.Enforce(roleName, path, method)
		if err != nil || !allowed {
			response.Forbidden(c, fmt.Sprintf("Access denied for role '%s' on %s %s", roleName, method, path))
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole is a quick helper for explicit role gates
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := GetCurrentRoleName(c)
		for _, r := range roles {
			if r == userRole || userRole == "Super Administrator" {
				c.Next()
				return
			}
		}
		response.Forbidden(c, "Insufficient role privileges to perform this action")
		c.Abort()
	}
}
