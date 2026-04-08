export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
export type Severity = 'critical' | 'warning' | 'info'

export interface Job {
  id: number
  playbook: string
  platform: string
  environment: string
  target_group: string
  target_hosts: string[]
  extra_vars: Record<string, unknown>
  forks: number
  tags: string[]
  skip_tags: string[]
  dry_run: boolean
  status: JobStatus
  triggered_by: string
  worker_id: string
  started_at: string | null
  finished_at: string | null
  created_at: string
  hosts_total: number
  hosts_ok: number
  hosts_changed: number
  hosts_failed: number
  hosts_skipped: number
}

export interface CreateJobRequest {
  playbook: string
  platform?: string
  environment: string
  target_group?: string
  target_hosts?: string[]
  extra_vars?: Record<string, unknown>
  forks?: number
  tags?: string[]
  skip_tags?: string[]
  dry_run?: boolean
  require_approval?: boolean
  dc_sequential?: boolean
  notify_slack?: boolean
}

export interface JobResult {
  id: number
  job_id: number
  hostname: string
  status: string
  task: string
  message: string
  created_at: string
}

export interface Approval {
  id: number
  job_id: number
  job?: Job
  requested_by: string
  approved_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  diff_preview: string | null
  created_at: string
  resolved_at: string | null
}

export interface Workflow {
  id: number
  name: string
  description: string
  definition: WorkflowDefinition
  status: string
  triggered_by: string
  created_at: string
}

export interface WorkflowDefinition {
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'job' | 'approval' | 'condition' | 'notification'
  status: 'idle' | 'running' | 'done' | 'failed' | 'waiting'
  config: Record<string, unknown>
  icon?: string
}

export interface InventoryGroup {
  group: string
  platform: string
  environment: string
  dc: string
  hosts: Host[]
  last_synced: string
}

export interface Host {
  hostname: string
  ip: string
  os: string
  status: 'active' | 'error' | 'maintenance'
  last_deployed: string | null
}

export interface Playbook {
  name: string
  platform: string
  description: string
  path: string
  tags: string[]
  success_rate: number
  last_run: string | null
  last_synced: string
}

export interface WorkerNode {
  id: string
  hostname: string
  ip: string
  role: 'primary' | 'secondary' | 'worker'
  status: 'active' | 'standby' | 'healthy' | 'degraded'
  cpu_percent: number
  ram_percent: number
  active_jobs: number
  queue_depth: number
}

export interface QueueStats {
  queued: number
  active: number
  completed: number
  failed: number
  workers: number
}

export interface Alert {
  id: string
  severity: Severity
  title: string
  body: string
  source: string
  job_id: number | null
  acked: boolean
  acked_by: string | null
  created_at: string
}

export interface Role {
  id: number
  name: string
  description: string
}

export interface PlaybookPermission {
  playbook: string
  role_id: number
  role_name: string
  can_execute: boolean
  can_view: boolean
  require_approval: 'none' | 'senior' | 'admin'
}

export interface User {
  id: string
  username: string
  email: string
  name: string
  roles: string[]
  groups: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface LogMessage {
  job_id: number
  type: 'log' | 'status' | 'stats'
  content: string
  time: string
}
