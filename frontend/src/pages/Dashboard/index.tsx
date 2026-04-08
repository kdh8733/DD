import { useQuery } from '@tanstack/react-query'
import { fetchJobs } from '@/api/jobs'
import { fetchQueueStats } from '@/api/workers'
import StatusBadge from '@/components/StatusBadge/StatusBadge'

export default function Dashboard() {
  const { data: runningJobs } = useQuery({
    queryKey: ['jobs', 'running'],
    queryFn: () => fetchJobs({ status: 'running' }),
    refetchInterval: 5000,
  })

  const { data: recentJobs } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => fetchJobs({ limit: 10 }),
  })

  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: fetchQueueStats,
    refetchInterval: 5000,
  })

  const stats = [
    { label: '오늘 배포', value: queueStats?.completed ?? 0 },
    { label: '성공률', value: queueStats ? `${Math.round((queueStats.completed / Math.max(queueStats.completed + queueStats.failed, 1)) * 100)}%` : '-' },
    { label: '승인대기', value: queueStats?.queued ?? 0 },
    { label: '관리 서버', value: queueStats?.workers ?? 0 },
  ]

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 실행 중 Job */}
      <div className="bg-white rounded-lg border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">실행 중인 작업</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">플레이북</th>
                <th className="px-5 py-3 text-left">환경</th>
                <th className="px-5 py-3 text-left">실행자</th>
                <th className="px-5 py-3 text-left">진행률</th>
                <th className="px-5 py-3 text-left">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runningJobs?.data.map((job) => {
                const progress = job.hosts_total > 0 ? Math.round(((job.hosts_ok + job.hosts_failed + job.hosts_skipped) / job.hosts_total) * 100) : 0
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono">#{job.id}</td>
                    <td className="px-5 py-3">{job.playbook}</td>
                    <td className="px-5 py-3">{job.environment}</td>
                    <td className="px-5 py-3">{job.triggered_by}</td>
                    <td className="px-5 py-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-brand h-2 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{progress}%</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={job.status} size="sm" /></td>
                  </tr>
                )
              })}
              {(!runningJobs || runningJobs.data.length === 0) && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">실행 중인 작업이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 최근 이력 */}
      <div className="bg-white rounded-lg border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">최근 실행 이력</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">플레이북</th>
                <th className="px-5 py-3 text-left">환경</th>
                <th className="px-5 py-3 text-left">서버수</th>
                <th className="px-5 py-3 text-left">실행자</th>
                <th className="px-5 py-3 text-left">상태</th>
                <th className="px-5 py-3 text-left">시각</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentJobs?.data.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3 font-mono">#{job.id}</td>
                  <td className="px-5 py-3">{job.playbook}</td>
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
      </div>
    </div>
  )
}
