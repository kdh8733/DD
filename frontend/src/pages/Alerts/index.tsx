import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAlerts, acknowledgeAlert } from '@/api/alerts'
import clsx from 'clsx'
import type { Severity } from '@/types'

const severityStyles: Record<Severity, string> = {
  critical: 'border-l-red-500 bg-red-50/50',
  warning: 'border-l-yellow-500 bg-yellow-50/50',
  info: 'border-l-brand bg-brand-light/40',
}

const severityLabels: Record<Severity | '', string> = {
  '': '전체',
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
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
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              severityFilter === s ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
            )}
          >
            {severityLabels[s]}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div className="space-y-2">
        {filtered?.map((alert) => (
          <div
            key={alert.id}
            className={clsx(
              'rounded-xl border border-l-4 p-4 shadow-card transition-opacity',
              severityStyles[alert.severity],
              alert.acked && 'opacity-50',
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase text-gray-500 tracking-wide">{alert.severity}</span>
                  <h3 className="font-semibold text-gray-900 truncate">{alert.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{alert.body}</p>
                <div className="text-xs text-gray-400 mt-2">
                  {alert.source}
                  {alert.job_id && <> · Job #{alert.job_id}</>}
                  {' · '}{alert.created_at}
                </div>
              </div>
              {!alert.acked ? (
                <button
                  onClick={() => ackMutation.mutate(alert.id)}
                  disabled={ackMutation.isPending}
                  className="ml-4 text-sm font-medium text-brand hover:text-brand-hover transition-colors flex-shrink-0"
                >
                  확인
                </button>
              ) : (
                <span className="ml-4 text-xs text-gray-400 flex-shrink-0">확인됨 ({alert.acked_by})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="card py-16 text-center text-sm text-gray-400">알림이 없습니다</div>
      )}
    </div>
  )
}
