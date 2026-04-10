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
      <div className="card p-4 flex flex-wrap gap-3">
        <select
          value={filter.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value || undefined)}
          className="w-auto"
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
          className="w-36"
        />
        <input
          type="text"
          placeholder="플랫폼"
          value={filter.platform ?? ''}
          onChange={(e) => updateFilter('platform', e.target.value || undefined)}
          className="w-32"
        />
        <input
          type="date"
          value={filter.start_date ?? ''}
          onChange={(e) => updateFilter('start_date', e.target.value || undefined)}
        />
        <input
          type="date"
          value={filter.end_date ?? ''}
          onChange={(e) => updateFilter('end_date', e.target.value || undefined)}
        />
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">플레이북</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">플랫폼</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">환경</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">서버수</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">실행자</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedJobId(job.id)}
              >
                <td className="px-5 py-3.5 font-mono text-gray-600">#{job.id}</td>
                <td className="px-5 py-3.5 text-gray-800">{job.playbook}</td>
                <td className="px-5 py-3.5 text-gray-600">{job.platform}</td>
                <td className="px-5 py-3.5 text-gray-600">{job.environment}</td>
                <td className="px-5 py-3.5 text-gray-600">{job.hosts_total}</td>
                <td className="px-5 py-3.5 text-gray-600">{job.triggered_by}</td>
                <td className="px-5 py-3.5"><StatusBadge status={job.status} size="sm" /></td>
                <td className="px-5 py-3.5 text-gray-400">{job.created_at}</td>
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
              className="btn-secondary px-4 py-1.5"
            >
              이전
            </button>
            <button
              disabled={(filter.offset ?? 0) + (filter.limit ?? 20) >= data.total}
              onClick={() => setFilter((f) => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 20) }))}
              className="btn-secondary px-4 py-1.5"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 선택된 Job 로그 */}
      {selectedJobId && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Job #{selectedJobId} 로그</h3>
            <button onClick={() => setSelectedJobId(null)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">닫기</button>
          </div>
          <LogViewer jobId={selectedJobId} />
        </div>
      )}
    </div>
  )
}
