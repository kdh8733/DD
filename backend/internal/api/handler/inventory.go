package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/repository"
)

type InventoryHandler struct {
	invRepo repository.InventoryRepository
	cfg     config.AnsibleConfig
	log     *zap.Logger
}

func NewInventoryHandler(invRepo repository.InventoryRepository, cfg config.AnsibleConfig, log *zap.Logger) *InventoryHandler {
	return &InventoryHandler{invRepo: invRepo, cfg: cfg, log: log}
}

// GET /api/v1/inventory/groups
func (h *InventoryHandler) ListGroups(c echo.Context) error {
	groups, err := h.invRepo.ListGroups(h.cfg.InventoryDir)
	if err != nil {
		h.log.Error("failed to list groups", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list inventory groups")
	}
	return c.JSON(http.StatusOK, groups)
}

// GET /api/v1/inventory/groups/:name
func (h *InventoryHandler) GetGroup(c echo.Context) error {
	name := c.Param("name")
	group, err := h.invRepo.LoadGroup(h.cfg.InventoryDir, name)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "group not found")
	}
	return c.JSON(http.StatusOK, group)
}

// GET /api/v1/inventory/search?q=...
func (h *InventoryHandler) Search(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "query parameter 'q' is required")
	}

	hosts, err := h.invRepo.SearchHosts(h.cfg.InventoryDir, query)
	if err != nil {
		h.log.Error("failed to search hosts", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "search failed")
	}
	return c.JSON(http.StatusOK, hosts)
}

// POST /api/v1/inventory/sync
func (h *InventoryHandler) TriggerSync(c echo.Context) error {
	// TODO: trigger CMDB sync process (e.g., enqueue async task or call external API)
	return c.JSON(http.StatusAccepted, map[string]string{
		"status":  "accepted",
		"message": "inventory sync triggered",
	})
}
