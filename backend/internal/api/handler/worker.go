package handler

import (
	"net/http"

	"github.com/hibiken/asynq"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
)

type WorkerHandler struct {
	inspector *asynq.Inspector
	log       *zap.Logger
}

func NewWorkerHandler(cfg config.RedisConfig, log *zap.Logger) *WorkerHandler {
	inspector := asynq.NewInspector(asynq.RedisClientOpt{Addr: cfg.URL, Password: cfg.Password})
	return &WorkerHandler{inspector: inspector, log: log}
}

// GET /api/v1/workers
func (h *WorkerHandler) List(c echo.Context) error {
	servers, err := h.inspector.Servers()
	if err != nil {
		h.log.Error("failed to list workers", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list workers")
	}

	var workers []map[string]any
	for _, s := range servers {
		workers = append(workers, map[string]any{
			"host":         s.Host,
			"pid":          s.PID,
			"status":       s.Status,
			"started_at":   s.Started,
			"active_count": len(s.ActiveWorkers),
			"queues":       s.Queues,
			"concurrency":  s.Concurrency,
		})
	}

	return c.JSON(http.StatusOK, workers)
}

// GET /api/v1/workers/queue-stats
func (h *WorkerHandler) QueueStats(c echo.Context) error {
	queues, err := h.inspector.Queues()
	if err != nil {
		h.log.Error("failed to get queues", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get queue stats")
	}

	var stats []map[string]any
	for _, q := range queues {
		info, err := h.inspector.GetQueueInfo(q)
		if err != nil {
			continue
		}
		stats = append(stats, map[string]any{
			"queue":     q,
			"size":      info.Size,
			"pending":   info.Pending,
			"active":    info.Active,
			"completed": info.Completed,
			"failed":    info.Failed,
			"scheduled": info.Scheduled,
			"retry":     info.Retry,
		})
	}

	return c.JSON(http.StatusOK, stats)
}
