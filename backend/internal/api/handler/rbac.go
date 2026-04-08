package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

type RBACHandler struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

func NewRBACHandler(pool *pgxpool.Pool, log *zap.Logger) *RBACHandler {
	return &RBACHandler{pool: pool, log: log}
}

// GET /api/v1/roles
func (h *RBACHandler) ListRoles(c echo.Context) error {
	rows, err := h.pool.Query(c.Request().Context(), "SELECT id, name, description FROM roles ORDER BY id")
	if err != nil {
		h.log.Error("failed to list roles", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list roles")
	}
	defer rows.Close()

	var roles []map[string]any
	for rows.Next() {
		var id int64
		var name, description string
		if err := rows.Scan(&id, &name, &description); err != nil {
			continue
		}
		roles = append(roles, map[string]any{"id": id, "name": name, "description": description})
	}

	return c.JSON(http.StatusOK, roles)
}

// GET /api/v1/playbook-permissions
func (h *RBACHandler) ListPermissions(c echo.Context) error {
	rows, err := h.pool.Query(c.Request().Context(),
		`SELECT playbook, role_id, can_execute, can_view, require_approval
		 FROM playbook_permissions ORDER BY playbook, role_id`)
	if err != nil {
		h.log.Error("failed to list permissions", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list permissions")
	}
	defer rows.Close()

	var perms []map[string]any
	for rows.Next() {
		var playbook string
		var roleID int64
		var canExec, canView, reqApproval bool
		if err := rows.Scan(&playbook, &roleID, &canExec, &canView, &reqApproval); err != nil {
			continue
		}
		perms = append(perms, map[string]any{
			"playbook":         playbook,
			"role_id":          roleID,
			"can_execute":      canExec,
			"can_view":         canView,
			"require_approval": reqApproval,
		})
	}

	return c.JSON(http.StatusOK, perms)
}

// PUT /api/v1/playbook-permissions
func (h *RBACHandler) UpdatePermission(c echo.Context) error {
	var req struct {
		Playbook        string `json:"playbook"`
		RoleID          int64  `json:"role_id"`
		CanExecute      bool   `json:"can_execute"`
		CanView         bool   `json:"can_view"`
		RequireApproval bool   `json:"require_approval"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	_, err := h.pool.Exec(c.Request().Context(),
		`INSERT INTO playbook_permissions (playbook, role_id, can_execute, can_view, require_approval)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (playbook, role_id) DO UPDATE
		 SET can_execute=$3, can_view=$4, require_approval=$5`,
		req.Playbook, req.RoleID, req.CanExecute, req.CanView, req.RequireApproval)
	if err != nil {
		h.log.Error("failed to update permission", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update permission")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
}
