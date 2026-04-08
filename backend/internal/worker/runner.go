package worker

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/dookdak/dookdak/backend/internal/config"
	"github.com/dookdak/dookdak/backend/internal/model"
)

type Runner struct {
	cfg *config.Config
	log *zap.Logger
	rdb *redis.Client
}

func NewRunner(cfg *config.Config, log *zap.Logger, rdb *redis.Client) *Runner {
	return &Runner{cfg: cfg, log: log, rdb: rdb}
}

func (r *Runner) Execute(ctx context.Context, job *model.Job) error {
	workDir := filepath.Join(os.TempDir(), "dookdak-jobs", fmt.Sprintf("%d", job.ID))
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return fmt.Errorf("create work dir: %w", err)
	}
	defer os.RemoveAll(workDir)

	// 1. Prepare inventory file
	inventoryFile := filepath.Join(workDir, "inventory")
	if err := r.writeInventory(inventoryFile, job); err != nil {
		return fmt.Errorf("write inventory: %w", err)
	}

	// 2. Prepare extra_vars file
	var extraVarsFile string
	if len(job.ExtraVars) > 0 {
		extraVarsFile = filepath.Join(workDir, "extravars.json")
		data, _ := json.Marshal(job.ExtraVars)
		if err := os.WriteFile(extraVarsFile, data, 0644); err != nil {
			return fmt.Errorf("write extravars: %w", err)
		}
	}

	// 3. Build ansible-runner command
	playbookPath := filepath.Join(r.cfg.Ansible.PlaybookDir, job.Playbook)
	args := []string{
		"run", workDir,
		"-p", playbookPath,
		"-i", inventoryFile,
	}
	if extraVarsFile != "" {
		args = append(args, "--extra-vars", "@"+extraVarsFile)
	}
	forks := job.Forks
	if forks <= 0 {
		forks = 50
	}
	args = append(args, "--forks", fmt.Sprintf("%d", forks))

	if len(job.Tags) > 0 {
		args = append(args, "--tags", strings.Join(job.Tags, ","))
	}
	if len(job.SkipTags) > 0 {
		args = append(args, "--skip-tags", strings.Join(job.SkipTags, ","))
	}
	if job.DryRun {
		args = append(args, "--check")
	}

	cmd := exec.CommandContext(ctx, r.cfg.Ansible.RunnerPath, args...)

	// 4. Stream stdout via Redis Pub/Sub
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("stdout pipe: %w", err)
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start ansible-runner: %w", err)
	}

	scanner := bufio.NewScanner(stdout)
	var fullOutput strings.Builder
	for scanner.Scan() {
		line := scanner.Text()
		fullOutput.WriteString(line + "\n")
		r.publishLog(job.ID, line)
	}

	// 5. Wait for completion
	if err := cmd.Wait(); err != nil {
		r.log.Error("ansible-runner failed", zap.Int64("job_id", job.ID), zap.Error(err))
		return err
	}

	// 6. Parse recap
	ok, changed, failed, skipped := r.parseRecap(fullOutput.String())
	job.HostsOk = ok
	job.HostsChanged = changed
	job.HostsFailed = failed
	job.HostsSkipped = skipped
	job.HostsTotal = ok + changed + failed + skipped

	return nil
}

func (r *Runner) publishLog(jobID int64, line string) {
	channel := fmt.Sprintf("job:logs:%d", jobID)
	r.rdb.Publish(context.Background(), channel, line)
}

func (r *Runner) writeInventory(path string, job *model.Job) error {
	var lines []string
	if len(job.TargetHosts) > 0 {
		lines = append(lines, "[targets]")
		lines = append(lines, job.TargetHosts...)
	} else if job.TargetGroup != "" {
		// Load from inventory directory
		groupFile := filepath.Join(r.cfg.Ansible.InventoryDir, job.TargetGroup+".json")
		data, err := os.ReadFile(groupFile)
		if err != nil {
			return fmt.Errorf("read group file: %w", err)
		}
		var group model.InventoryGroup
		if err := json.Unmarshal(data, &group); err != nil {
			return fmt.Errorf("parse group: %w", err)
		}
		lines = append(lines, "[targets]")
		for _, h := range group.Hosts {
			lines = append(lines, h.Hostname)
		}
	}
	return os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0644)
}

var recapRegex = regexp.MustCompile(`(\S+)\s+:\s+ok=(\d+)\s+changed=(\d+)\s+unreachable=\d+\s+failed=(\d+)\s+skipped=(\d+)`)

func (r *Runner) parseRecap(output string) (ok, changed, failed, skipped int) {
	for _, match := range recapRegex.FindAllStringSubmatch(output, -1) {
		if len(match) >= 6 {
			v, _ := strconv.Atoi(match[2])
			ok += v
			v, _ = strconv.Atoi(match[3])
			changed += v
			v, _ = strconv.Atoi(match[4])
			failed += v
			v, _ = strconv.Atoi(match[5])
			skipped += v
		}
	}
	return
}
