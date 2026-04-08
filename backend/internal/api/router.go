package api

import (
	"net/http"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/api/handler"
	"github.com/dookdak/dookdak/backend/internal/api/middleware"
	"github.com/dookdak/dookdak/backend/internal/api/ws"
	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/repository"
	"github.com/dookdak/dookdak/backend/internal/service"
)

func SetupRoutes(e *echo.Echo, cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client, hub *ws.Hub, log *zap.Logger, gitSync *service.GitSyncService) {
	// Auth middleware
	authMW, err := middleware.NewAuthMiddleware(cfg.Keycloak)
	if err != nil {
		log.Fatal("failed to init auth middleware", zap.Error(err))
	}
	rbacMW := middleware.NewRBACMiddleware()

	// Repositories
	jobRepo := repository.NewJobRepository(db)
	approvalRepo := repository.NewApprovalRepository(db)
	invRepo := repository.NewInventoryRepository()

	// Asynq client
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: cfg.Redis.URL, Password: cfg.Redis.Password})

	// Handlers
	jobHandler := handler.NewJobHandler(jobRepo, approvalRepo, asynqClient, hub, log)
	approvalHandler := handler.NewApprovalHandler(approvalRepo, jobRepo, asynqClient, log)
	invHandler := handler.NewInventoryHandler(invRepo, cfg.Ansible, log)
	playbookHandler := handler.NewPlaybookHandler(cfg.Ansible, log)
	workerHandler := handler.NewWorkerHandler(cfg.Redis, log)
	alertHandler := handler.NewAlertHandler(rdb, log)
	rbacHandler := handler.NewRBACHandler(db, log)

	// Health check (no auth)
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// API v1 group
	v1 := e.Group("/api/v1", authMW.Authenticate())

	// Jobs
	jobs := v1.Group("/jobs")
	jobs.POST("", jobHandler.Create)
	jobs.GET("", jobHandler.List)
	jobs.GET("/:id", jobHandler.Get)
	jobs.POST("/:id/cancel", jobHandler.Cancel)
	jobs.GET("/:id/results", jobHandler.GetResults)

	// WebSocket (separate, no standard auth middleware)
	e.GET("/ws/jobs/:id/logs", jobHandler.StreamLogs)

	// Approvals
	approvals := v1.Group("/approvals")
	approvals.GET("", approvalHandler.List)
	approvals.POST("/:id/approve", approvalHandler.Approve, rbacMW.RequireRole("infra-admin", "infra-senior"))
	approvals.POST("/:id/reject", approvalHandler.Reject, rbacMW.RequireRole("infra-admin", "infra-senior"))

	// Inventory
	inv := v1.Group("/inventory")
	inv.GET("/groups", invHandler.ListGroups)
	inv.GET("/groups/:name", invHandler.GetGroup)
	inv.GET("/search", invHandler.Search)
	inv.POST("/sync", invHandler.TriggerSync, rbacMW.RequireRole("infra-admin", "infra-senior"))

	// Playbooks
	pb := v1.Group("/playbooks")
	pb.GET("", playbookHandler.List)
	pb.GET("/:name", playbookHandler.Get)

	// Workers
	workers := v1.Group("/workers")
	workers.GET("", workerHandler.List)
	workers.GET("/queue-stats", workerHandler.QueueStats)

	// Alerts
	alerts := v1.Group("/alerts")
	alerts.GET("", alertHandler.List)
	alerts.PATCH("/:id/ack", alertHandler.Acknowledge)

	// RBAC (Admin only)
	rbac := v1.Group("/rbac", rbacMW.RequireRole("infra-admin"))
	rbac.GET("/roles", rbacHandler.ListRoles)
	rbac.GET("/permissions", rbacHandler.ListPermissions)
	rbac.PUT("/permissions", rbacHandler.UpdatePermission)

	// Git Sync
	syncHandler := handler.NewSyncHandler(gitSync, log)
	gitSyncGroup := v1.Group("/git-sync")
	gitSyncGroup.GET("/status", syncHandler.GetStatus)
	gitSyncGroup.POST("/trigger", syncHandler.TriggerSync, rbacMW.RequireRole("infra-admin", "infra-senior"))

	// GitHub Webhook (no JWT auth — verified by HMAC)
	e.POST("/webhook/github", syncHandler.Webhook)
}
