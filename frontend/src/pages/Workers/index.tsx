import { useQuery } from '@tanstack/react-query'
import { fetchWorkers, fetchQueueStats } from '@/api/workers'
import clsx from 'clsx'

export default function Workers() {
  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
    refetchInterval: 5000,
  })

  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: fetchQueueStats,
    refetchInterval: 3000,
  })

  return (
    <div className="space-y-6">
      {/* 큐 현황 */}
      {queueStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {([
            ['대기', queueStats.queued, 'text-gray-600'],
            ['실행중', queueStats.active, 'text-blue-600'],
            ['완료', queueStats.completed, 'text-green-600'],
            ['실패', queueStats.failed, 'text-red-600'],
            ['워커', queueStats.workers, 'text-brand'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className={clsx('text-2xl font-bold mt-1.5', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 워커 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers?.map((w) => (
          <div key={w.id} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{w.hostname}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{w.ip}</p>
              </div>
              <span className={clsx(
                'text-xs px-2.5 py-1 rounded-full font-medium',
                (w.status === 'active' || w.status === 'healthy') && 'bg-green-50 text-green-700',
                w.status === 'standby' && 'bg-yellow-50 text-yellow-700',
                w.status === 'degraded' && 'bg-red-50 text-red-700',
              )}>
                {w.status}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>CPU</span>
                  <span className="font-medium">{w.cpu_percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full transition-all', w.cpu_percent > 80 ? 'bg-red-500' : 'bg-brand')}
                    style={{ width: `${w.cpu_percent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>RAM</span>
                  <span className="font-medium">{w.ram_percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full transition-all', w.ram_percent > 80 ? 'bg-red-500' : 'bg-brand')}
                    style={{ width: `${w.ram_percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
              <span>역할: {w.role}</span>
              <span>활성: {w.active_jobs}</span>
              <span>큐: {w.queue_depth}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
