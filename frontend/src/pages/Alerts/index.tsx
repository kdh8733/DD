import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAlerts, acknowledgeAlert } from '@/api/alerts'
import clsx from 'clsx'
import type { Severity } from '@/types'

const severityStyles: Record<Severity, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning: 'border-l-yellow-500 bg-yellow-50',
  info: 'border-l-blue-500 bg-blue-50',
}

export default function Alerts() {
  const queryClient = useQueryClient()
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('')

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 10000,
  })

  const ackMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const filtered = severityFilter
    ? alerts?.filter((a) => a.severity === severityFilter)
    : alerts

  return (
    <div className="space-y-4">
      {/* 심각도 필터 */}
      <div className="flex gap-2">
        {(['', 'critical', 'warning', 'info'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={clsx(
              'px-3 py-1 rounded-lg text-sm',
              severityFilter === s ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {s || '전체'}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div className="space-y-2">
        {filtered?.map((alert) => (
          <div
            key={alert.id}
            className={clsx(
              'bg-white rounded-lg border border-l-4 p-4',
              severityStyles[alert.severity],
              alert.acked && 'opacity-60',
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-gray-500">{alert.severity}</span>
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.body}</p>
                <div className="text-xs text-gray-400 mt-2">
                  출처: {alert.source}
                  {alert.job_id && <> | Job #{alert.job_id}</>}
                  {' | '}{alert.created_at}
                </div>
              </div>
              {!alert.acked && (
                <button
                  onClick={() => ackMutation.mutate(alert.id)}
                  disabled={ackMutation.isPending}
                  className="text-sm text-brand hover:text-brand-hover whitespace-nowrap"
                >
                  확인
                </button>
              )}
              {alert.acked && (
                <span className="text-xs text-gray-400">확인됨 ({alert.acked_by})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-12 text-gray-400">알림이 없습니다</div>
      )}
    </div>
  )
}
