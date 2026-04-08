package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/redis/go-redis/v9"

	"github.com/dookdak/dookdak/backend/internal/api"
	"github.com/dookdak/dookdak/backend/internal/api/ws"
	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/db"
	"github.com/dookdak/dookdak/backend/internal/logger"
	"github.com/dookdak/dookdak/backend/internal/service"
)

func main() {
	// 1. Config (godotenv loaded in config.init())
	cfg := config.Load()

	// 2. Logger
	log := logger.New(cfg.Server.LogLevel)
	defer log.Sync()

	// 3. Database
	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.Database)
	if err != nil {
		log.Fatal("failed to connect to database: " + err.Error())
	}
	defer pool.Close()

	// 4. Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.URL,
		Password: cfg.Redis.Password,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatal("failed to connect to redis: " + err.Error())
	}
	defer rdb.Close()

	// 5. WebSocket Hub
	hub := ws.NewHub(rdb, log)
	go hub.Run()

	// 5a. Git Sync Service
	gitSync := service.NewGitSyncService(cfg.GitSync, cfg.Ansible.PlaybookDir, log)
	go gitSync.Start(ctx)

	// 6. Echo
	e := echo.New()
	e.HideBanner = true

	// Middleware
	e.Use(echomw.RecoverWithConfig(echomw.RecoverConfig{DisablePrintStack: true}))
	e.Use(echomw.Logger())
	e.Use(echomw.RequestID())
	e.Use(echomw.GzipWithConfig(echomw.GzipConfig{Level: 5}))
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// 7. Routes
	api.SetupRoutes(e, cfg, pool, rdb, hub, log, gitSync)

	// 8. Graceful shutdown
	go func() {
		if err := e.Start(":" + cfg.Server.Port); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error: " + err.Error())
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Fatal("server forced shutdown: " + err.Error())
	}
	log.Info("server stopped")
}
