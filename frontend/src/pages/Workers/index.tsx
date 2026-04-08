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
            ['워커', queueStats.workers, 'text-indigo-600'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="bg-white rounded-lg border p-4 text-center">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={clsx('text-2xl font-bold mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 워커 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers?.map((w) => (
          <div key={w.id} className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{w.hostname}</h3>
                <p className="text-xs text-gray-400 font-mono">{w.ip}</p>
              </div>
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                (w.status === 'active' || w.status === 'healthy') && 'bg-green-100 text-green-700',
                w.status === 'standby' && 'bg-yellow-100 text-yellow-700',
                w.status === 'degraded' && 'bg-red-100 text-red-700',
              )}>
                {w.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <div className="flex justify-between text-gray-500 mb-1">
                  <span>CPU</span>
                  <span>{w.cpu_percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full', w.cpu_percent > 80 ? 'bg-red-500' : 'bg-brand')}
                    style={{ width: `${w.cpu_percent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-gray-500 mb-1">
                  <span>RAM</span>
                  <span>{w.ram_percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full', w.ram_percent > 80 ? 'bg-red-500' : 'bg-brand')}
                    style={{ width: `${w.ram_percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-400 mt-3 pt-3 border-t">
              <span>역할: {w.role}</span>
              <span>활성 작업: {w.active_jobs}</span>
              <span>큐: {w.queue_depth}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
