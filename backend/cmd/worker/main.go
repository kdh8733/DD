package main

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/db"
	"github.com/dookdak/dookdak/backend/internal/logger"
	"github.com/dookdak/dookdak/backend/internal/repository"
	"github.com/dookdak/dookdak/backend/internal/service"
	"github.com/dookdak/dookdak/backend/internal/worker"
)

func main() {
	// 1. Config
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

	// 5. Dependencies
	jobRepo := repository.NewJobRepository(pool)
	runner := worker.NewRunner(cfg, log, rdb)
	notifier := service.NewNotificationService(&cfg.Notification, log)
	processor := worker.NewProcessor(runner, jobRepo, notifier, log)

	// 6. Asynq Server
	srv := worker.NewAsynqServer(cfg)

	mux := asynq.NewServeMux()
	mux.HandleFunc("job:execute", processor.ProcessTask)

	log.Info("starting worker...")
	if err := srv.Run(mux); err != nil {
		log.Fatal("worker failed: " + err.Error())
	}
}
