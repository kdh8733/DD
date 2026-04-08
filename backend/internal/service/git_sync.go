package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
)

// SyncStatus is the current state of the GitHub sync service.
type SyncStatus struct {
	Enabled      bool      `json:"enabled"`
	RepoURL      string    `json:"repo_url"`
	Branch       string    `json:"branch"`
	LocalDir     string    `json:"local_dir"`
	LastSyncedAt *time.Time `json:"last_synced_at"`
	LastCommit   string    `json:"last_commit"`
	LastError    string    `json:"last_error"`
	SyncInterval int       `json:"sync_interval_seconds"`
	IsRunning    bool      `json:"is_running"`
}

// GitSyncService polls (or receives webhooks for) a GitHub repository
// and keeps the local playbook directory up to date.
type GitSyncService struct {
	cfg    config.GitSyncConfig
	dir    string // resolved local directory
	log    *zap.Logger
	mu     sync.RWMutex
	status SyncStatus
}

func NewGitSyncService(cfg config.GitSyncConfig, ansiblePlaybookDir string, log *zap.Logger) *GitSyncService {
	localDir := cfg.LocalDir
	if localDir == "" {
		localDir = ansiblePlaybookDir
	}
	return &GitSyncService{
		cfg: cfg,
		dir: localDir,
		log: log,
		status: SyncStatus{
			Enabled:      cfg.RepoURL != "",
			RepoURL:      cfg.RepoURL,
			Branch:       cfg.Branch,
			LocalDir:     localDir,
			SyncInterval: cfg.SyncInterval,
		},
	}
}

// Start begins the polling loop. It blocks until ctx is cancelled.
func (s *GitSyncService) Start(ctx context.Context) {
	if s.cfg.RepoURL == "" {
		s.log.Info("git-sync: GITHUB_REPO_URL not set, sync disabled")
		return
	}

	// Initial sync on startup
	s.log.Info("git-sync: performing initial sync", zap.String("repo", s.cfg.RepoURL))
	if err := s.Sync(ctx); err != nil {
		s.log.Warn("git-sync: initial sync failed", zap.Error(err))
	}

	if s.cfg.SyncInterval <= 0 {
		s.log.Info("git-sync: polling disabled (GITHUB_SYNC_INTERVAL_SECONDS=0), using webhook only")
		return
	}

	ticker := time.NewTicker(time.Duration(s.cfg.SyncInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.log.Info("git-sync: polling stopped")
			return
		case <-ticker.C:
			if err := s.Sync(ctx); err != nil {
				s.log.Warn("git-sync: sync failed", zap.Error(err))
			}
		}
	}
}

// Sync runs git clone (if needed) or git pull, and updates status.
func (s *GitSyncService) Sync(ctx context.Context) error {
	s.mu.Lock()
	s.status.IsRunning = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.status.IsRunning = false
		s.mu.Unlock()
	}()

	var err error
	if s.isCloned() {
		err = s.pull(ctx)
	} else {
		err = s.clone(ctx)
	}

	now := time.Now()
	s.mu.Lock()
	s.status.LastSyncedAt = &now
	if err != nil {
		s.status.LastError = err.Error()
	} else {
		s.status.LastError = ""
		s.status.LastCommit = s.headCommit(ctx)
	}
	s.mu.Unlock()

	if err == nil {
		s.log.Info("git-sync: sync completed",
			zap.String("commit", s.status.LastCommit),
			zap.String("dir", s.dir),
		)
	}
	return err
}

// GetStatus returns a copy of the current sync status.
func (s *GitSyncService) GetStatus() SyncStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.status
}

// VerifyWebhookSignature validates the GitHub HMAC-SHA256 signature.
// signature is the value of the X-Hub-Signature-256 header.
func (s *GitSyncService) VerifyWebhookSignature(payload []byte, signature string) bool {
	if s.cfg.WebhookSecret == "" {
		return true // secret not configured → skip verification (dev mode)
	}
	expected := "sha256=" + s.computeHMAC(payload)
	return hmac.Equal([]byte(signature), []byte(expected))
}

func (s *GitSyncService) computeHMAC(payload []byte) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.WebhookSecret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// isCloned checks whether the local directory is already a git repo.
func (s *GitSyncService) isCloned() bool {
	info, err := os.Stat(filepath.Join(s.dir, ".git"))
	return err == nil && info.IsDir()
}

func (s *GitSyncService) clone(ctx context.Context) error {
	s.log.Info("git-sync: cloning repository", zap.String("repo", s.cfg.RepoURL), zap.String("dir", s.dir))
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("mkdir %s: %w", s.dir, err)
	}
	args := []string{"clone", "--depth=1", "--branch", s.cfg.Branch, s.repoURLWithToken(), s.dir}
	return s.git(ctx, ".", args...)
}

func (s *GitSyncService) pull(ctx context.Context) error {
	// Make sure we are on the correct branch and tracking origin.
	if err := s.git(ctx, s.dir, "fetch", "--depth=1", "origin", s.cfg.Branch); err != nil {
		return err
	}
	return s.git(ctx, s.dir, "reset", "--hard", "origin/"+s.cfg.Branch)
}

func (s *GitSyncService) headCommit(ctx context.Context) string {
	cmd := exec.CommandContext(ctx, "git", "-C", s.dir, "rev-parse", "--short", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// git runs a git command and streams output to the logger.
func (s *GitSyncService) git(ctx context.Context, dir string, args ...string) error {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if len(out) > 0 {
		s.log.Debug("git-sync: git output", zap.String("output", string(out)))
	}
	if err != nil {
		return fmt.Errorf("git %s: %w\n%s", args[0], err, string(out))
	}
	return nil
}

// repoURLWithToken injects the PAT into the HTTPS URL for authentication.
// e.g. https://github.com/org/repo → https://<token>@github.com/org/repo
func (s *GitSyncService) repoURLWithToken() string {
	if s.cfg.Token == "" {
		return s.cfg.RepoURL
	}
	// Inject token into https:// URL
	if strings.HasPrefix(s.cfg.RepoURL, "https://") {
		return "https://" + s.cfg.Token + "@" + strings.TrimPrefix(s.cfg.RepoURL, "https://")
	}
	return s.cfg.RepoURL
}

// WebhookPayload is the minimal GitHub push event payload we care about.
type WebhookPayload struct {
	Ref        string `json:"ref"`
	HeadCommit struct {
		ID      string `json:"id"`
		Message string `json:"message"`
		Author  struct {
			Name string `json:"name"`
		} `json:"author"`
	} `json:"head_commit"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
}

func ParseWebhookPayload(body []byte) (*WebhookPayload, error) {
	var p WebhookPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return nil, err
	}
	return &p, nil
}
