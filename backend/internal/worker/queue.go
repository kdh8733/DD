package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/model"
	"github.com/dookdak/dookdak/backend/internal/repository"
	"github.com/dookdak/dookdak/backend/internal/service"
)

type Processor struct {
	runner   *Runner
	jobRepo  repository.JobRepository
	notifier *service.NotificationService
	log      *zap.Logger
}

func NewProcessor(runner *Runner, jobRepo repository.JobRepository, notifier *service.NotificationService, log *zap.Logger) *Processor {
	return &Processor{
		runner:   runner,
		jobRepo:  jobRepo,
		notifier: notifier,
		log:      log,
	}
}

func (p *Processor) ProcessTask(ctx context.Context, t *asynq.Task) error {
	// 1. Parse payload
	var payload struct {
		JobID int64 `json:"job_id"`
	}
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("parse task payload: %w", err)
	}

	p.log.Info("processing job", zap.Int64("job_id", payload.JobID))

	// 2. Update status to running
	if err := p.jobRepo.UpdateJobStatus(ctx, payload.JobID, model.JobStatusRunning); err != nil {
		return fmt.Errorf("update job status to running: %w", err)
	}

	// 3. Fetch job details
	job, err := p.jobRepo.GetJobByID(ctx, payload.JobID)
	if err != nil {
		return fmt.Errorf("get job: %w", err)
	}

	// 4. Execute ansible-runner
	execErr := p.runner.Execute(ctx, job)

	// 5. Update final status and stats
	var finalStatus model.JobStatus
	if execErr != nil {
		finalStatus = model.JobStatusFailed
		p.log.Error("job failed", zap.Int64("job_id", payload.JobID), zap.Error(execErr))
	} else {
		finalStatus = model.JobStatusSuccess
	}

	if err := p.jobRepo.UpdateJobStatus(ctx, payload.JobID, finalStatus); err != nil {
		p.log.Error("failed to update final status", zap.Error(err))
	}

	if err := p.jobRepo.UpdateJobStats(ctx, payload.JobID,
		job.HostsTotal, job.HostsOk, job.HostsChanged, job.HostsFailed, job.HostsSkipped); err != nil {
		p.log.Error("failed to update job stats", zap.Error(err))
	}

	// 6. Send notification
	if finalStatus == model.JobStatusSuccess {
		_ = p.notifier.SendJobCompleted(job)
	} else {
		_ = p.notifier.SendJobFailed(job)
	}

	return execErr
}

func NewAsynqServer(cfg *config.Config) *asynq.Server {
	return asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.Redis.URL, Password: cfg.Redis.Password},
		asynq.Config{
			Concurrency: 5,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)
}
