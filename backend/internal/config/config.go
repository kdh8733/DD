package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Database     DatabaseConfig
	Redis        RedisConfig
	Keycloak     KeycloakConfig
	Ansible      AnsibleConfig
	Server       ServerConfig
	Notification NotificationConfig
	GitSync      GitSyncConfig
}

type DatabaseConfig struct {
	URL      string
	MaxConns int32
}

type RedisConfig struct {
	URL      string
	Password string
}

type KeycloakConfig struct {
	URL          string
	Realm        string
	ClientID     string
	ClientSecret string
}

type AnsibleConfig struct {
	PlaybookDir  string
	InventoryDir string
	RunnerPath   string
}

type ServerConfig struct {
	Port       string
	LogLevel   string
	MaxWSConns int
}

type NotificationConfig struct {
	SlackWebhookURL     string
	PagerDutyRoutingKey string
}

type GitSyncConfig struct {
	RepoURL        string
	Branch         string
	Token          string
	SyncInterval   int    // seconds; 0 = polling disabled
	WebhookSecret  string
	LocalDir       string // fallback to AnsibleConfig.PlaybookDir if empty
}

func init() {
	_ = godotenv.Load(".env")
}

func Load() *Config {
	return &Config{
		Database: DatabaseConfig{
			URL:      getEnv("DATABASE_URL", "postgres://dookdak:dookdak@localhost:5432/dookdak?sslmode=disable"),
			MaxConns: int32(getEnvInt("DATABASE_MAX_CONNS", 20)),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
		},
		Keycloak: KeycloakConfig{
			URL:          getEnv("KEYCLOAK_URL", "http://localhost:8180"),
			Realm:        getEnv("KEYCLOAK_REALM", "dookdak"),
			ClientID:     getEnv("KEYCLOAK_CLIENT_ID", "dookdak-api"),
			ClientSecret: getEnv("KEYCLOAK_CLIENT_SECRET", ""),
		},
		Ansible: AnsibleConfig{
			PlaybookDir:  getEnv("ANSIBLE_PLAYBOOK_DIR", "/opt/ansible/playbooks"),
			InventoryDir: getEnv("ANSIBLE_INVENTORY_DIR", "/opt/ansible/inventory"),
			RunnerPath:   getEnv("ANSIBLE_RUNNER_PATH", "ansible-runner"),
		},
		Server: ServerConfig{
			Port:       getEnv("SERVER_PORT", "8080"),
			LogLevel:   getEnv("LOG_LEVEL", "info"),
			MaxWSConns: getEnvInt("MAX_WS_CONNS", 1000),
		},
		Notification: NotificationConfig{
			SlackWebhookURL:     getEnv("SLACK_WEBHOOK_URL", ""),
			PagerDutyRoutingKey: getEnv("PAGERDUTY_ROUTING_KEY", ""),
		},
		GitSync: GitSyncConfig{
			RepoURL:       getEnv("GITHUB_REPO_URL", ""),
			Branch:        getEnv("GITHUB_BRANCH", "main"),
			Token:         getEnv("GITHUB_TOKEN", ""),
			SyncInterval:  getEnvInt("GITHUB_SYNC_INTERVAL_SECONDS", 60),
			WebhookSecret: getEnv("GITHUB_WEBHOOK_SECRET", ""),
			LocalDir:      getEnv("GITHUB_LOCAL_DIR", ""),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
