package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type Alert struct {
	ID        string    `json:"id"`
	Severity  string    `json:"severity"` // critical/warning/info
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Source    string    `json:"source"`
	Acked     bool      `json:"acked"`
	CreatedAt time.Time `json:"created_at"`
}

type AlertHandler struct {
	rdb *redis.Client
	log *zap.Logger
}

func NewAlertHandler(rdb *redis.Client, log *zap.Logger) *AlertHandler {
	return &AlertHandler{rdb: rdb, log: log}
}

const alertsKey = "dookdak:alerts"

// GET /api/v1/alerts
func (h *AlertHandler) List(c echo.Context) error {
	ctx := c.Request().Context()

	result, err := h.rdb.HGetAll(ctx, alertsKey).Result()
	if err != nil {
		h.log.Error("failed to list alerts", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list alerts")
	}

	var alerts []map[string]string
	for id, val := range result {
		alerts = append(alerts, map[string]string{
			"id":   id,
			"data": val,
		})
	}

	return c.JSON(http.StatusOK, alerts)
}

// PATCH /api/v1/alerts/:id/ack
func (h *AlertHandler) Acknowledge(c echo.Context) error {
	id := c.Param("id")
	ctx := c.Request().Context()

	exists, err := h.rdb.HExists(ctx, alertsKey, id).Result()
	if err != nil || !exists {
		return echo.NewHTTPError(http.StatusNotFound, "alert not found")
	}

	// TODO: update the alert's acked field in the hash value (parse JSON, set acked=true, save back)
	// Simplified: delete the alert from the hash
	if err := h.rdb.HDel(ctx, alertsKey, id).Err(); err != nil {
		h.log.Error("failed to ack alert", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to acknowledge alert")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "acknowledged"})
}
