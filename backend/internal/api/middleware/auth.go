package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/model"
)

type AuthMiddleware struct {
	keySet jwk.Set
	cfg    config.KeycloakConfig
}

func NewAuthMiddleware(cfg config.KeycloakConfig) (*AuthMiddleware, error) {
	jwksURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", cfg.URL, cfg.Realm)

	ctx := context.Background()
	keySet, err := jwk.Fetch(ctx, jwksURL)
	if err != nil {
		return nil, fmt.Errorf("fetch JWKS: %w", err)
	}

	return &AuthMiddleware{
		keySet: keySet,
		cfg:    cfg,
	}, nil
}

func (m *AuthMiddleware) Authenticate() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			auth := c.Request().Header.Get("Authorization")
			if auth == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing authorization header")
			}

			parts := strings.SplitN(auth, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid authorization format")
			}
			tokenStr := parts[1]

			token, err := jwt.Parse([]byte(tokenStr), jwt.WithKeySet(m.keySet))
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
			}

			user := &model.User{
				ID: token.Subject(),
			}

			claims := token.PrivateClaims()
			if v, ok := claims["preferred_username"].(string); ok {
				user.Username = v
			}
			if v, ok := claims["email"].(string); ok {
				user.Email = v
			}
			if v, ok := claims["name"].(string); ok {
				user.Name = v
			}
			if groups, ok := claims["groups"].([]interface{}); ok {
				for _, g := range groups {
					if s, ok := g.(string); ok {
						user.Groups = append(user.Groups, s)
					}
				}
			}
			// Extract realm roles
			if ra, ok := claims["realm_access"].(map[string]interface{}); ok {
				if roles, ok := ra["roles"].([]interface{}); ok {
					for _, r := range roles {
						if s, ok := r.(string); ok {
							user.Roles = append(user.Roles, s)
						}
					}
				}
			}

			c.Set("user", user)
			return next(c)
		}
	}
}
