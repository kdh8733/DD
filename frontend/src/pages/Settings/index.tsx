import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { syncApi, type SyncStatus } from '@/api/sync'
import { formatDistanceToNow } from 'date-fns'

interface SettingsForm {
  keycloakUrl: string
  keycloakRealm: string
  keycloakClientId: string
  slackWebhookUrl: string
  defaultForks: number
  maxConcurrentJobs: number
  logRetentionDays: number
}

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>({
    keycloakUrl: '',
    keycloakRealm: 'dookdak',
    keycloakClientId: 'dookdak-frontend',
    slackWebhookUrl: '',
    defaultForks: 10,
    maxConcurrentJobs: 5,
    logRetentionDays: 90,
  })

  const [saved, setSaved] = useState(false)
  const qc = useQueryClient()

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['git-sync-status'],
    queryFn: syncApi.getStatus,
    refetchInterval: 5000,
  })

  const triggerSync = useMutation({
    mutationFn: syncApi.trigger,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['git-sync-status'] }),
  })

  const update = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API 연동 - POST /api/settings
    setSaved(true)
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 border-b pb-3">Keycloak 설정</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keycloak URL</label>
          <input
            type="url"
            value={form.keycloakUrl}
            onChange={(e) => update('keycloakUrl', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="https://keycloak.example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Realm</label>
          <input
            type="text"
            value={form.keycloakRealm}
            onChange={(e) => update('keycloakRealm', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
          <input
            type="text"
            value={form.keycloakClientId}
            onChange={(e) => update('keycloakClientId', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 border-b pb-3">알림 설정</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slack Webhook URL</label>
          <input
            type="url"
            value={form.slackWebhookUrl}
            onChange={(e) => update('slackWebhookUrl', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 border-b pb-3">실행 설정</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기본 Forks</label>
            <input
              type="number"
              value={form.defaultForks}
              onChange={(e) => update('defaultForks', Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">최대 동시 실행</label>
            <input
              type="number"
              value={form.maxConcurrentJobs}
              onChange={(e) => update('maxConcurrentJobs', Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">로그 보관 (일)</label>
            <input
              type="number"
              value={form.logRetentionDays}
              onChange={(e) => update('logRetentionDays', Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-hover text-sm font-medium"
        >
          저장
        </button>
        {saved && <span className="text-green-600 text-sm">설정이 저장되었습니다.</span>}
      </div>

      {/* GitHub Ansible Repo Sync */}
      <GitSyncPanel status={syncStatus} onTrigger={() => triggerSync.mutate()} isTriggerPending={triggerSync.isPending} />
    </form>
  )
}

function GitSyncPanel({
  status,
  onTrigger,
  isTriggerPending,
}: {
  status?: SyncStatus
  onTrigger: () => void
  isTriggerPending: boolean
}) {
  if (!status) return null

  const syncLabel = status.is_running
    ? '동기화 중...'
    : isTriggerPending
    ? '요청 중...'
    : '지금 동기화'

  return (
    <div className="bg-white rounded-lg border p-5 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="font-semibold text-gray-900">GitHub Ansible Repo 동기화</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            !status.enabled
              ? 'bg-gray-100 text-gray-500'
              : status.last_error
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {!status.enabled ? '비활성' : status.last_error ? '오류' : '정상'}
        </span>
      </div>

      {!status.enabled ? (
        <p className="text-sm text-gray-500">
          <code className="bg-gray-100 px-1 rounded">GITHUB_REPO_URL</code> 환경변수를 설정하면 자동 동기화가 활성화됩니다.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Row label="저장소" value={status.repo_url} mono />
            <Row label="브랜치" value={status.branch} mono />
            <Row label="로컬 경로" value={status.local_dir} mono />
            <Row
              label="폴링 주기"
              value={status.sync_interval_seconds > 0 ? `${status.sync_interval_seconds}초` : 'webhook 전용'}
            />
            <Row
              label="마지막 동기화"
              value={
                status.last_synced_at
                  ? formatDistanceToNow(new Date(status.last_synced_at), { addSuffix: true })
                  : '없음'
              }
            />
            <Row label="커밋" value={status.last_commit || '—'} mono />
          </div>

          {status.last_error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs font-medium text-red-600 mb-1">마지막 오류</p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">{status.last_error}</pre>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onTrigger}
              disabled={status.is_running || isTriggerPending}
              className="bg-gray-800 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(status.is_running || isTriggerPending) && (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {syncLabel}
            </button>
            <p className="text-xs text-gray-400">
              Webhook URL: <code className="bg-gray-100 px-1 rounded">POST /webhook/github</code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className={mono ? 'font-mono text-xs text-gray-800 truncate' : 'text-gray-800'}>{value}</span>
    </>
  )
}
