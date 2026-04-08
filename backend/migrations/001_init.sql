-- +goose Up

CREATE TABLE jobs (
    id            BIGSERIAL PRIMARY KEY,
    playbook      TEXT NOT NULL,
    platform      TEXT NOT NULL DEFAULT '',
    environment   TEXT NOT NULL,
    target_group  TEXT NOT NULL DEFAULT '',
    target_hosts  JSONB NOT NULL DEFAULT '[]',
    extra_vars    JSONB NOT NULL DEFAULT '{}',
    forks         INT NOT NULL DEFAULT 50,
    tags          TEXT[] NOT NULL DEFAULT '{}',
    skip_tags     TEXT[] NOT NULL DEFAULT '{}',
    dry_run       BOOLEAN NOT NULL DEFAULT FALSE,
    status        TEXT NOT NULL DEFAULT 'queued',
    triggered_by  TEXT NOT NULL,
    worker_id     TEXT NOT NULL DEFAULT '',
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    hosts_total   INT NOT NULL DEFAULT 0,
    hosts_ok      INT NOT NULL DEFAULT 0,
    hosts_changed INT NOT NULL DEFAULT 0,
    hosts_failed  INT NOT NULL DEFAULT 0,
    hosts_skipped INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_created_at ON jobs (created_at DESC);

CREATE TABLE job_results (
    id         BIGSERIAL PRIMARY KEY,
    job_id     BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    hostname   TEXT NOT NULL,
    status     TEXT NOT NULL,
    task       TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_results_job_id ON job_results (job_id);

CREATE TABLE approvals (
    id           BIGSERIAL PRIMARY KEY,
    job_id       BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    approved_by  TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'pending',
    comment      TEXT NOT NULL DEFAULT '',
    diff_preview TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE workflows (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    definition   JSONB NOT NULL DEFAULT '{}',
    status       TEXT NOT NULL DEFAULT 'active',
    triggered_by TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);

INSERT INTO roles (name, description) VALUES
    ('Platform Admin', 'Full platform access'),
    ('Senior DevOps', 'Senior operations engineer with approval rights'),
    ('DevOps', 'Operations engineer'),
    ('Developer', 'Application developer with limited deployment access'),
    ('Viewer', 'Read-only access');

CREATE TABLE playbook_permissions (
    playbook         TEXT NOT NULL,
    role_id          BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    can_execute      BOOLEAN NOT NULL DEFAULT FALSE,
    can_view         BOOLEAN NOT NULL DEFAULT TRUE,
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (playbook, role_id)
);

CREATE TABLE alerts (
    id         BIGSERIAL PRIMARY KEY,
    severity   TEXT NOT NULL DEFAULT 'info',
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    source     TEXT NOT NULL DEFAULT '',
    job_id     BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
    acked      BOOLEAN NOT NULL DEFAULT FALSE,
    acked_by   TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS playbook_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS job_results;
DROP TABLE IF EXISTS jobs;
