package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
)

type PlaybookHandler struct {
	cfg config.AnsibleConfig
	log *zap.Logger
}

func NewPlaybookHandler(cfg config.AnsibleConfig, log *zap.Logger) *PlaybookHandler {
	return &PlaybookHandler{cfg: cfg, log: log}
}

// GET /api/v1/playbooks
func (h *PlaybookHandler) List(c echo.Context) error {
	entries, err := os.ReadDir(h.cfg.PlaybookDir)
	if err != nil {
		h.log.Error("failed to list playbooks", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list playbooks")
	}

	var playbooks []map[string]string
	for _, e := range entries {
		name := e.Name()
		if !e.IsDir() && (strings.HasSuffix(name, ".yml") || strings.HasSuffix(name, ".yaml")) {
			playbooks = append(playbooks, map[string]string{"name": name})
		}
	}

	return c.JSON(http.StatusOK, playbooks)
}

// GET /api/v1/playbooks/:name
func (h *PlaybookHandler) Get(c echo.Context) error {
	name := c.Param("name")
	// Prevent directory traversal
	if strings.Contains(name, "..") || strings.ContainsAny(name, `/\`) {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid playbook name")
	}

	path := filepath.Join(h.cfg.PlaybookDir, name)
	data, err := os.ReadFile(path)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "playbook not found")
	}

	return c.JSON(http.StatusOK, map[string]string{
		"name":    name,
		"content": string(data),
	})
}
