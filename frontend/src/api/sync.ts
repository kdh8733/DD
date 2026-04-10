import client from './client'

export interface SyncStatus {
  enabled: boolean
  repo_url: string
  branch: string
  local_dir: string
  last_synced_at: string | null
  last_commit: string
  last_error: string
  sync_interval_seconds: number
  is_running: boolean
}

export const syncApi = {
  getStatus: () => client.get<SyncStatus>('/git-sync/status').then((r) => r.data),
  trigger: () => client.post<{ status: string }>('/git-sync/trigger').then((r) => r.data),
}
