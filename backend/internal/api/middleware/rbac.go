package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/dookdak/dookdak/backend/internal/model"
)

type RBACMiddleware struct{}

func NewRBACMiddleware() *RBACMiddleware {
	return &RBACMiddleware{}
}

func (m *RBACMiddleware) RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, ok := c.Get("user").(*model.User)
			if !ok || user == nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "user not found in context")
			}

			for _, required := range roles {
				for _, userRole := range user.Roles {
					if userRole == required {
						return next(c)
					}
				}
			}

			return echo.NewHTTPError(http.StatusForbidden, "insufficient permissions")
		}
	}
}
