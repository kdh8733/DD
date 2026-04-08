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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* 플레이북 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">플레이북</label>
        <select
          value={form.playbook}
          onChange={(e) => update('playbook', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          required
        >
          <option value="">선택...</option>
          {playbooks?.map((p) => (
            <option key={p.name} value={p.name}>{p.name} — {p.description}</option>
          ))}
        </select>
      </div>

      {/* 환경 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">환경</label>
        <select
          value={form.environment}
          onChange={(e) => update('environment', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="dev">dev</option>
          <option value="stg">stg</option>
          <option value="prod">prod</option>
        </select>
      </div>

      {/* 대상 그룹 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">대상 그룹</label>
        <select
          value={form.target_group}
          onChange={(e) => update('target_group', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체</option>
          {groups?.map((g) => (
            <option key={g.group} value={g.group}>{g.group} ({g.hosts.length} hosts)</option>
          ))}
        </select>
      </div>

      {/* Forks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Forks</label>
        <input
          type="number"
          value={form.forks}
          onChange={(e) => update('forks', Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          min={1}
          max={100}
        />
      </div>

      {/* 특정 서버 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">특정 서버 (줄바꿈 구분)</label>
        <textarea
          value={hostsText}
          onChange={(e) => setHostsText(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          rows={3}
          placeholder="server01.example.com&#10;server02.example.com"
        />
      </div>

      {/* Extra Vars */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Extra Vars (JSON)</label>
        <textarea
          value={extraVarsText}
          onChange={(e) => setExtraVarsText(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          rows={4}
          placeholder='{"version": "1.2.3"}'
        />
      </div>

      {/* 옵션 체크박스 */}
      <div className="flex flex-wrap gap-4">
        {([
          ['dry_run', 'Dry Run'],
          ['require_approval', '승인 필요'],
          ['dc_sequential', 'DC 순차 실행'],
          ['notify_slack', 'Slack 알림'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form[key]}
              onChange={(e) => update(key, e.target.checked)}
              className="rounded border-gray-300"
            />
            {label}
          </label>
        ))}
      </div>

      {/* 제출 */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-hover disabled:opacity-50 text-sm font-medium"
      >
        {mutation.isPending ? '실행 중...' : '배포 실행'}
      </button>

      {mutation.isError && (
        <p className="text-red-500 text-sm">배포 실행에 실패했습니다.</p>
      )}
    </form>
  )
}
