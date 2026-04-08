package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
	"github.com/hibiken/asynq"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/api/ws"
	"github.com/dookdak/dookdak/backend/internal/model"
	"github.com/dookdak/dookdak/backend/internal/repository"
)

type JobHandler struct {
	jobRepo     repository.JobRepository
	approvalRepo repository.ApprovalRepository
	asynqClient *asynq.Client
	hub         *ws.Hub
	log         *zap.Logger
}

func NewJobHandler(
	jobRepo repository.JobRepository,
	approvalRepo repository.ApprovalRepository,
	asynqClient *asynq.Client,
	hub *ws.Hub,
	log *zap.Logger,
) *JobHandler {
	return &JobHandler{
		jobRepo:      jobRepo,
		approvalRepo: approvalRepo,
		asynqClient:  asynqClient,
		hub:          hub,
		log:          log,
	}
}

// POST /api/v1/jobs
func (h *JobHandler) Create(c echo.Context) error {
	var req model.CreateJobRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	user := c.Get("user").(*model.User)

	job := &model.Job{
		Playbook:    req.Playbook,
		Platform:    req.Platform,
		Environment: req.Environment,
		TargetGroup: req.TargetGroup,
		TargetHosts: req.TargetHosts,
		ExtraVars:   req.ExtraVars,
		Forks:       req.Forks,
		Tags:        req.Tags,
		SkipTags:    req.SkipTags,
		DryRun:      req.DryRun,
		TriggeredBy: user.Username,
	}

	id, err := h.jobRepo.CreateJob(c.Request().Context(), job)
	if err != nil {
		h.log.Error("failed to create job", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create job")
	}
	job.ID = id

	if req.RequireApproval {
		approval := &model.Approval{
			JobID:       id,
			RequestedBy: user.Username,
		}
		_, err := h.approvalRepo.CreateApproval(c.Request().Context(), approval)
		if err != nil {
			h.log.Error("failed to create approval", zap.Error(err))
		}
		return c.JSON(http.StatusAccepted, map[string]any{
			"id":      id,
			"status":  "pending_approval",
			"message": "job requires approval before execution",
		})
	}

	// Enqueue to Asynq
	payload, _ := json.Marshal(map[string]any{"job_id": id})
	task := asynq.NewTask("job:execute", payload)
	_, err = h.asynqClient.Enqueue(task, asynq.Queue("default"), asynq.MaxRetry(0))
	if err != nil {
		h.log.Error("failed to enqueue job", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to enqueue job")
	}

	return c.JSON(http.StatusCreated, map[string]any{"id": id, "status": "queued"})
}

// GET /api/v1/jobs
func (h *JobHandler) List(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	offset, _ := strconv.Atoi(c.QueryParam("offset"))

	filter := model.ListJobsFilter{
		Status:      c.QueryParam("status"),
		Playbook:    c.QueryParam("playbook"),
		Platform:    c.QueryParam("platform"),
		Environment: c.QueryParam("environment"),
		TriggeredBy: c.QueryParam("triggered_by"),
		Limit:       limit,
		Offset:      offset,
	}

	jobs, total, err := h.jobRepo.ListJobs(c.Request().Context(), filter)
	if err != nil {
		h.log.Error("failed to list jobs", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list jobs")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"jobs":  jobs,
		"total": total,
	})
}

// GET /api/v1/jobs/:id
func (h *JobHandler) Get(c echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid job id")
	}

	job, err := h.jobRepo.GetJobByID(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "job not found")
	}

	return c.JSON(http.StatusOK, job)
}

// POST /api/v1/jobs/:id/cancel
func (h *JobHandler) Cancel(c echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid job id")
	}

	if err := h.jobRepo.UpdateJobStatus(c.Request().Context(), id, model.JobStatusCancelled); err != nil {
		h.log.Error("failed to cancel job", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to cancel job")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "cancelled"})
}

// GET /api/v1/jobs/:id/results
func (h *JobHandler) GetResults(c echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid job id")
	}

	results, err := h.jobRepo.GetJobResults(c.Request().Context(), id)
	if err != nil {
		h.log.Error("failed to get job results", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get results")
	}

	return c.JSON(http.StatusOK, results)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// GET /ws/jobs/:id/logs
func (h *JobHandler) StreamLogs(c echo.Context) error {
	jobID := c.Param("id")
	return ws.ServeWS(h.hub, c, jobID)
}
