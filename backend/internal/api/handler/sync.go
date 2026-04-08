package handler

import (
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/service"
)

// SyncHandler exposes git-sync status, manual trigger, and GitHub webhook.
type SyncHandler struct {
	svc *service.GitSyncService
	log *zap.Logger
}

func NewSyncHandler(svc *service.GitSyncService, log *zap.Logger) *SyncHandler {
	return &SyncHandler{svc: svc, log: log}
}

// GetStatus godoc
// GET /api/v1/git-sync/status
func (h *SyncHandler) GetStatus(c echo.Context) error {
	return c.JSON(http.StatusOK, h.svc.GetStatus())
}

// TriggerSync godoc
// POST /api/v1/git-sync/trigger
func (h *SyncHandler) TriggerSync(c echo.Context) error {
	st := h.svc.GetStatus()
	if !st.Enabled {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "git-sync is disabled (GITHUB_REPO_URL not set)",
		})
	}
	if st.IsRunning {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": "sync already in progress",
		})
	}

	// Run in background so the request returns immediately.
	go func() {
		if err := h.svc.Sync(c.Request().Context()); err != nil {
			h.log.Warn("git-sync: manual trigger failed", zap.Error(err))
		}
	}()

	return c.JSON(http.StatusAccepted, map[string]string{"status": "sync started"})
}

// Webhook godoc
// POST /webhook/github
// Handles GitHub push events. No JWT auth — verified by HMAC signature.
func (h *SyncHandler) Webhook(c echo.Context) error {
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "failed to read body"})
	}

	signature := c.Request().Header.Get("X-Hub-Signature-256")
	if !h.svc.VerifyWebhookSignature(body, signature) {
		h.log.Warn("git-sync: webhook signature mismatch", zap.String("remote", c.RealIP()))
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid signature"})
	}

	// Only handle push events.
	event := c.Request().Header.Get("X-GitHub-Event")
	if event != "push" {
		return c.JSON(http.StatusOK, map[string]string{"status": "ignored", "event": event})
	}

	payload, err := service.ParseWebhookPayload(body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}

	// Only sync when the push is to the configured branch.
	st := h.svc.GetStatus()
	expectedRef := "refs/heads/" + st.Branch
	if payload.Ref != expectedRef {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ignored",
			"reason": "push to " + payload.Ref + ", watching " + expectedRef,
		})
	}

	h.log.Info("git-sync: webhook received push event",
		zap.String("repo", payload.Repository.FullName),
		zap.String("commit", payload.HeadCommit.ID),
		zap.String("author", payload.HeadCommit.Author.Name),
	)

	go func() {
		if err := h.svc.Sync(c.Request().Context()); err != nil {
			h.log.Warn("git-sync: webhook-triggered sync failed", zap.Error(err))
		}
	}()

	return c.JSON(http.StatusOK, map[string]string{"status": "sync started"})
}
