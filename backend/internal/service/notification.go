package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/model"
)

type NotificationService struct {
	cfg *config.NotificationConfig
	log *zap.Logger
}

func NewNotificationService(cfg *config.NotificationConfig, log *zap.Logger) *NotificationService {
	return &NotificationService{cfg: cfg, log: log}
}

type SlackMessage struct {
	Text        string            `json:"text"`
	Attachments []SlackAttachment `json:"attachments,omitempty"`
}

type SlackAttachment struct {
	Color  string `json:"color"`
	Title  string `json:"title"`
	Text   string `json:"text"`
	Footer string `json:"footer"`
}

func (s *NotificationService) SendJobCompleted(job *model.Job) error {
	msg := SlackMessage{
		Text: fmt.Sprintf("Job #%d completed successfully", job.ID),
		Attachments: []SlackAttachment{{
			Color:  "good",
			Title:  fmt.Sprintf("[%s] %s - %s", job.Environment, job.Playbook, job.Platform),
			Text:   fmt.Sprintf("OK: %d | Changed: %d | Failed: %d | Skipped: %d", job.HostsOk, job.HostsChanged, job.HostsFailed, job.HostsSkipped),
			Footer: fmt.Sprintf("Triggered by %s", job.TriggeredBy),
		}},
	}
	return s.sendSlack(msg)
}

func (s *NotificationService) SendJobFailed(job *model.Job) error {
	msg := SlackMessage{
		Text: fmt.Sprintf("Job #%d FAILED", job.ID),
		Attachments: []SlackAttachment{{
			Color:  "danger",
			Title:  fmt.Sprintf("[%s] %s - %s", job.Environment, job.Playbook, job.Platform),
			Text:   fmt.Sprintf("OK: %d | Changed: %d | Failed: %d | Skipped: %d", job.HostsOk, job.HostsChanged, job.HostsFailed, job.HostsSkipped),
			Footer: fmt.Sprintf("Triggered by %s", job.TriggeredBy),
		}},
	}
	return s.sendSlack(msg)
}

func (s *NotificationService) SendApprovalRequest(job *model.Job, approval *model.Approval) error {
	msg := SlackMessage{
		Text: fmt.Sprintf("Approval requested for Job #%d", job.ID),
		Attachments: []SlackAttachment{{
			Color:  "warning",
			Title:  fmt.Sprintf("[%s] %s - %s", job.Environment, job.Playbook, job.Platform),
			Text:   fmt.Sprintf("Requested by %s\nTarget: %s", approval.RequestedBy, job.TargetGroup),
			Footer: "Please review and approve/reject in DookDak",
		}},
	}
	return s.sendSlack(msg)
}

func (s *NotificationService) sendSlack(msg SlackMessage) error {
	if s.cfg.SlackWebhookURL == "" {
		s.log.Debug("slack webhook not configured, skipping notification")
		return nil
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal slack message: %w", err)
	}

	resp, err := http.Post(s.cfg.SlackWebhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("send slack message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack returned status %d", resp.StatusCode)
	}

	return nil
}
