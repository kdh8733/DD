package model

import "time"

type JobStatus string

const (
	JobStatusQueued    JobStatus = "queued"
	JobStatusRunning   JobStatus = "running"
	JobStatusSuccess   JobStatus = "success"
	JobStatusFailed    JobStatus = "failed"
	JobStatusCancelled JobStatus = "cancelled"
)

type Job struct {
	ID          int64          `json:"id"`
	Playbook    string         `json:"playbook"`
	Platform    string         `json:"platform"`
	Environment string         `json:"environment"`
	TargetGroup string         `json:"target_group"`
	TargetHosts []string       `json:"target_hosts"`
	ExtraVars   map[string]any `json:"extra_vars"`
	Forks       int            `json:"forks"`
	Tags        []string       `json:"tags"`
	SkipTags    []string       `json:"skip_tags"`
	DryRun      bool           `json:"dry_run"`
	Status      JobStatus      `json:"status"`
	TriggeredBy string         `json:"triggered_by"`
	WorkerID    string         `json:"worker_id"`
	StartedAt   *time.Time     `json:"started_at"`
	FinishedAt  *time.Time     `json:"finished_at"`
	CreatedAt   time.Time      `json:"created_at"`
	// Stats
	HostsTotal   int `json:"hosts_total"`
	HostsOk      int `json:"hosts_ok"`
	HostsChanged int `json:"hosts_changed"`
	HostsFailed  int `json:"hosts_failed"`
	HostsSkipped int `json:"hosts_skipped"`
}

type CreateJobRequest struct {
	Playbook        string         `json:"playbook" validate:"required"`
	Platform        string         `json:"platform"`
	Environment     string         `json:"environment" validate:"required"`
	TargetGroup     string         `json:"target_group"`
	TargetHosts     []string       `json:"target_hosts"`
	ExtraVars       map[string]any `json:"extra_vars"`
	Forks           int            `json:"forks"`
	Tags            []string       `json:"tags"`
	SkipTags        []string       `json:"skip_tags"`
	DryRun          bool           `json:"dry_run"`
	RequireApproval bool           `json:"require_approval"`
	DCSequential    bool           `json:"dc_sequential"`
	NotifySlack     bool           `json:"notify_slack"`
}

type JobResult struct {
	ID        int64     `json:"id"`
	JobID     int64     `json:"job_id"`
	Hostname  string    `json:"hostname"`
	Status    string    `json:"status"`
	Task      string    `json:"task"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type ListJobsFilter struct {
	Status      string
	Playbook    string
	Platform    string
	Environment string
	TriggeredBy string
	StartDate   *time.Time
	EndDate     *time.Time
	Limit       int
	Offset      int
}

type Approval struct {
	ID          int64      `json:"id"`
	JobID       int64      `json:"job_id"`
	RequestedBy string     `json:"requested_by"`
	ApprovedBy  string     `json:"approved_by"`
	Status      string     `json:"status"` // pending, approved, rejected
	Comment     string     `json:"comment"`
	DiffPreview string     `json:"diff_preview"`
	CreatedAt   time.Time  `json:"created_at"`
	ResolvedAt  *time.Time `json:"resolved_at"`
}
