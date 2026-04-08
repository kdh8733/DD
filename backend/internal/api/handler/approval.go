package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/hibiken/asynq"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/model"
	"github.com/dookdak/dookdak/backend/internal/repository"
)

type ApprovalHandler struct {
	approvalRepo repository.ApprovalRepository
	jobRepo      repository.JobRepository
	asynqClient  *asynq.Client
	log          *zap.Logger
}

func NewApprovalHandler(
	approvalRepo repository.ApprovalRepository,
	jobRepo repository.JobRepository,
	asynqClient *asynq.Client,
	log *zap.Logger,
) *ApprovalHandler {
	return &ApprovalHandler{
		approvalRepo: approvalRepo,
		jobRepo:      jobRepo,
		asynqClient:  asynqClient,
		log:          log,
	}
}

// GET /api/v1/approvals
func (h *ApprovalHandler) List(c echo.Context) error {
	approvals, err := h.approvalRepo.GetPendingApprovals(c.Request().Context())
	if err != nil {
		h.log.Error("failed to list approvals", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list approvals")
	}
	return c.JSON(http.StatusOK, approvals)
}

// POST /api/v1/approvals/:id/approve
func (h *ApprovalHandler) Approve(c echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid approval id")
	}

	user := c.Get("user").(*model.User)

	var body struct {
		Comment string `json:"comment"`
	}
	_ = c.Bind(&body)

	if err := h.approvalRepo.ApproveJob(c.Request().Context(), id, user.Username, body.Comment); err != nil {
		h.log.Error("failed to approve", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to approve")
	}

	// TODO: fetch approval to get job_id, then enqueue the job
	// For now, enqueue assuming id maps to job_id (simplified)
	payload, _ := json.Marshal(map[string]any{"job_id": id})
	task := asynq.NewTask("job:execute", payload)
	_, _ = h.asynqClient.Enqueue(task, asynq.Queue("default"), asynq.MaxRetry(0))

	return c.JSON(http.StatusOK, map[string]string{"status": "approved"})
}

// POST /api/v1/approvals/:id/reject
func (h *ApprovalHandler) Reject(c echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid approval id")
	}

	user := c.Get("user").(*model.User)

	var body struct {
		Comment string `json:"comment"`
	}
	_ = c.Bind(&body)

	if err := h.approvalRepo.RejectJob(c.Request().Context(), id, user.Username, body.Comment); err != nil {
		h.log.Error("failed to reject", zap.Error(err))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to reject")
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "rejected"})
}
