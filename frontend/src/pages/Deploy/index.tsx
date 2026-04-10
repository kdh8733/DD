import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchPlaybooks } from '@/api/playbooks'
import { fetchGroups } from '@/api/inventory'
import { createJob } from '@/api/jobs'
import type { CreateJobRequest } from '@/types'

export default function Deploy() {
  const navigate = useNavigate()

  const { data: playbooks } = useQuery({ queryKey: ['playbooks'], queryFn: fetchPlaybooks })
  const { data: groups } = useQuery({ queryKey: ['inventory-groups'], queryFn: fetchGroups })

  const [form, setForm] = useState<CreateJobRequest>({
    playbook: '',
    environment: 'dev',
    target_group: '',
    target_hosts: [],
    extra_vars: {},
    forks: 10,
    tags: [],
    skip_tags: [],
    dry_run: false,
    require_approval: false,
    dc_sequential: false,
    notify_slack: false,
  })

  const [extraVarsText, setExtraVarsText] = useState('')
  const [hostsText, setHostsText] = useState('')

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => navigate('/history'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const req: CreateJobRequest = {
      ...form,
      target_hosts: hostsText ? hostsText.split('\n').map((h) => h.trim()).filter(Boolean) : [],
      extra_vars: extraVarsText ? JSON.parse(extraVarsText) : {},
    }
    mutation.mutate(req)
  }

  const update = <K extends keyof CreateJobRequest>(key: K, value: CreateJobRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-4">배포 설정</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">플레이북</label>
          <select
            value={form.playbook}
            onChange={(e) => update('playbook', e.target.value)}
            className="w-full"
            required
          >
            <option value="">선택...</option>
            {playbooks?.map((p) => (
              <option key={p.name} value={p.name}>{p.name} — {p.description}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">환경</label>
            <select
              value={form.environment}
              onChange={(e) => update('environment', e.target.value)}
              className="w-full"
            >
              <option value="dev">dev</option>
              <option value="stg">stg</option>
              <option value="prod">prod</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Forks</label>
            <input
              type="number"
              value={form.forks}
              onChange={(e) => update('forks', Number(e.target.value))}
              className="w-full"
              min={1}
              max={100}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">대상 그룹</label>
          <select
            value={form.target_group}
            onChange={(e) => update('target_group', e.target.value)}
            className="w-full"
          >
            <option value="">전체</option>
            {groups?.map((g) => (
              <option key={g.group} value={g.group}>{g.group} ({g.hosts.length} hosts)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">특정 서버 (줄바꿈 구분)</label>
          <textarea
            value={hostsText}
            onChange={(e) => setHostsText(e.target.value)}
            className="w-full font-mono"
            rows={3}
            placeholder="server01.example.com&#10;server02.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Extra Vars (JSON)</label>
          <textarea
            value={extraVarsText}
            onChange={(e) => setExtraVarsText(e.target.value)}
            className="w-full font-mono"
            rows={4}
            placeholder='{"version": "1.2.3"}'
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">옵션</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {([
              ['dry_run', 'Dry Run'],
              ['require_approval', '승인 필요'],
              ['dc_sequential', 'DC 순차 실행'],
              ['notify_slack', 'Slack 알림'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  className="rounded border-gray-300 text-brand focus:ring-brand/20"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? '실행 중...' : '배포 실행'}
        </button>
        {mutation.isError && (
          <p className="text-red-500 text-sm">배포 실행에 실패했습니다.</p>
        )}
      </div>
    </form>
  )
}
