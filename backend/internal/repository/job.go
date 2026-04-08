package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dookdak/dookdak/backend/internal/model"
)

type JobRepository interface {
	CreateJob(ctx context.Context, job *model.Job) (int64, error)
	GetJobByID(ctx context.Context, id int64) (*model.Job, error)
	ListJobs(ctx context.Context, filter model.ListJobsFilter) ([]*model.Job, int, error)
	UpdateJobStatus(ctx context.Context, id int64, status model.JobStatus) error
	UpdateJobStats(ctx context.Context, id int64, total, ok, changed, failed, skipped int) error
	CreateJobResult(ctx context.Context, result *model.JobResult) error
	GetJobResults(ctx context.Context, jobID int64) ([]*model.JobResult, error)
}

type pgJobRepository struct {
	pool *pgxpool.Pool
}

func NewJobRepository(pool *pgxpool.Pool) JobRepository {
	return &pgJobRepository{pool: pool}
}

func (r *pgJobRepository) CreateJob(ctx context.Context, job *model.Job) (int64, error) {
	targetHosts, _ := json.Marshal(job.TargetHosts)
	extraVars, _ := json.Marshal(job.ExtraVars)

	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO jobs (playbook, platform, environment, target_group, target_hosts, extra_vars,
			forks, tags, skip_tags, dry_run, status, triggered_by, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
		RETURNING id`,
		job.Playbook, job.Platform, job.Environment, job.TargetGroup,
		targetHosts, extraVars, job.Forks, job.Tags, job.SkipTags,
		job.DryRun, model.JobStatusQueued, job.TriggeredBy,
	).Scan(&id)
	return id, err
}

func (r *pgJobRepository) GetJobByID(ctx context.Context, id int64) (*model.Job, error) {
	job := &model.Job{}
	var targetHosts, extraVars []byte

	err := r.pool.QueryRow(ctx, `
		SELECT id, playbook, platform, environment, target_group, target_hosts, extra_vars,
			forks, tags, skip_tags, dry_run, status, triggered_by, worker_id,
			started_at, finished_at, hosts_total, hosts_ok, hosts_changed, hosts_failed, hosts_skipped, created_at
		FROM jobs WHERE id = $1`, id).Scan(
		&job.ID, &job.Playbook, &job.Platform, &job.Environment, &job.TargetGroup,
		&targetHosts, &extraVars, &job.Forks, &job.Tags, &job.SkipTags,
		&job.DryRun, &job.Status, &job.TriggeredBy, &job.WorkerID,
		&job.StartedAt, &job.FinishedAt, &job.HostsTotal, &job.HostsOk,
		&job.HostsChanged, &job.HostsFailed, &job.HostsSkipped, &job.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(targetHosts, &job.TargetHosts)
	_ = json.Unmarshal(extraVars, &job.ExtraVars)
	return job, nil
}

func (r *pgJobRepository) ListJobs(ctx context.Context, filter model.ListJobsFilter) ([]*model.Job, int, error) {
	var conditions []string
	var args []any
	argIdx := 1

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Playbook != "" {
		conditions = append(conditions, fmt.Sprintf("playbook = $%d", argIdx))
		args = append(args, filter.Playbook)
		argIdx++
	}
	if filter.Platform != "" {
		conditions = append(conditions, fmt.Sprintf("platform = $%d", argIdx))
		args = append(args, filter.Platform)
		argIdx++
	}
	if filter.Environment != "" {
		conditions = append(conditions, fmt.Sprintf("environment = $%d", argIdx))
		args = append(args, filter.Environment)
		argIdx++
	}
	if filter.TriggeredBy != "" {
		conditions = append(conditions, fmt.Sprintf("triggered_by = $%d", argIdx))
		args = append(args, filter.TriggeredBy)
		argIdx++
	}
	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, filter.StartDate)
		argIdx++
	}
	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, filter.EndDate)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count
	var total int
	countQuery := "SELECT COUNT(*) FROM jobs " + where
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	query := fmt.Sprintf("SELECT id, playbook, platform, environment, status, triggered_by, created_at FROM jobs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", where, argIdx, argIdx+1)
	args = append(args, limit, filter.Offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var jobs []*model.Job
	for rows.Next() {
		j := &model.Job{}
		if err := rows.Scan(&j.ID, &j.Playbook, &j.Platform, &j.Environment, &j.Status, &j.TriggeredBy, &j.CreatedAt); err != nil {
			return nil, 0, err
		}
		jobs = append(jobs, j)
	}
	return jobs, total, nil
}

func (r *pgJobRepository) UpdateJobStatus(ctx context.Context, id int64, status model.JobStatus) error {
	var setClause string
	switch status {
	case model.JobStatusRunning:
		setClause = "status = $2, started_at = NOW()"
	case model.JobStatusSuccess, model.JobStatusFailed, model.JobStatusCancelled:
		setClause = "status = $2, finished_at = NOW()"
	default:
		setClause = "status = $2"
	}
	_, err := r.pool.Exec(ctx, fmt.Sprintf("UPDATE jobs SET %s WHERE id = $1", setClause), id, status)
	return err
}

func (r *pgJobRepository) UpdateJobStats(ctx context.Context, id int64, total, ok, changed, failed, skipped int) error {
	_, err := r.pool.Exec(ctx,
		"UPDATE jobs SET hosts_total=$2, hosts_ok=$3, hosts_changed=$4, hosts_failed=$5, hosts_skipped=$6 WHERE id=$1",
		id, total, ok, changed, failed, skipped)
	return err
}

func (r *pgJobRepository) CreateJobResult(ctx context.Context, result *model.JobResult) error {
	_, err := r.pool.Exec(ctx,
		"INSERT INTO job_results (job_id, hostname, status, task, message, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
		result.JobID, result.Hostname, result.Status, result.Task, result.Message, time.Now())
	return err
}

func (r *pgJobRepository) GetJobResults(ctx context.Context, jobID int64) ([]*model.JobResult, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT id, job_id, hostname, status, task, message, created_at FROM job_results WHERE job_id = $1 ORDER BY created_at", jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*model.JobResult
	for rows.Next() {
		r := &model.JobResult{}
		if err := rows.Scan(&r.ID, &r.JobID, &r.Hostname, &r.Status, &r.Task, &r.Message, &r.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}
