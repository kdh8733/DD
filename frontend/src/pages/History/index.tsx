import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJobs, type JobFilter } from '@/api/jobs'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import LogViewer from '@/components/LogViewer/LogViewer'

export default function History() {
  const [filter, setFilter] = useState<JobFilter>({ limit: 20, offset: 0 })
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  const { data } = useQuery({
    queryKey: ['jobs', filter],
    queryFn: () => fetchJobs(filter),
  })

  const updateFilter = <K extends keyof JobFilter>(key: K, value: JobFilter[K]) => {
    setFilter((prev) => ({ ...prev, [key]: value, offset: 0 }))
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap gap-3 bg-white rounded-lg border p-4">
        <select
          value={filter.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value || undefined)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="queued">대기</option>
          <option value="running">실행중</option>
          <option value="success">성공</option>
          <option value="failed">실패</option>
          <option value="cancelled">취소</option>
        </select>
        <input
          type="text"
          placeholder="플레이북"
          value={filter.playbook ?? ''}
          onChange={(e) => updateFilter('playbook', e.target.value || undefined)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="플랫폼"
          value={filter.platform ?? ''}
          onChange={(e) => updateFilter('platform', e.target.value || undefined)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={filter.start_date ?? ''}
          onChange={(e) => updateFilter('start_date', e.target.value || undefined)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={filter.end_date ?? ''}
          onChange={(e) => updateFilter('end_date', e.target.value || undefined)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">ID</th>
              <th className="px-5 py-3 text-left">플레이북</th>
              <th className="px-5 py-3 text-left">플랫폼</th>
              <th className="px-5 py-3 text-left">환경</th>
              <th className="px-5 py-3 text-left">서버수</th>
              <th className="px-5 py-3 text-left">실행자</th>
              <th className="px-5 py-3 text-left">상태</th>
              <th className="px-5 py-3 text-left">시각</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedJobId(job.id)}
              >
                <td className="px-5 py-3 font-mono">#{job.id}</td>
                <td className="px-5 py-3">{job.playbook}</td>
                <td className="px-5 py-3">{job.platform}</td>
                <td className="px-5 py-3">{job.environment}</td>
                <td className="px-5 py-3">{job.hosts_total}</td>
                <td className="px-5 py-3">{job.triggered_by}</td>
                <td className="px-5 py-3"><StatusBadge status={job.status} size="sm" /></td>
                <td className="px-5 py-3 text-gray-400">{job.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {data && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>총 {data.total}건</span>
          <div className="flex gap-2">
            <button
              disabled={filter.offset === 0}
              onClick={() => setFilter((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - (f.limit ?? 20)) }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              이전
            </button>
            <button
              disabled={(filter.offset ?? 0) + (filter.limit ?? 20) >= data.total}
              onClick={() => setFilter((f) => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 20) }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 선택된 Job 로그 */}
      {selectedJobId && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Job #{selectedJobId} 로그</h3>
            <button onClick={() => setSelectedJobId(null)} className="text-gray-400 hover:text-gray-600">닫기</button>
          </div>
          <LogViewer jobId={selectedJobId} />
        </div>
      )}
    </div>
  )
}
