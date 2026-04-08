import clsx from 'clsx'
import type { JobStatus } from '@/types'

interface Props {
  status: JobStatus | string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { color: string; label: string }> = {
  queued: { color: 'bg-gray-100 text-gray-600', label: '대기' },
  running: { color: 'bg-blue-100 text-blue-700', label: '실행중' },
  success: { color: 'bg-green-100 text-green-700', label: '성공' },
  failed: { color: 'bg-red-100 text-red-700', label: '실패' },
  cancelled: { color: 'bg-yellow-100 text-yellow-700', label: '취소' },
  pending: { color: 'bg-orange-100 text-orange-700', label: '승인대기' },
  approved: { color: 'bg-green-100 text-green-700', label: '승인' },
  rejected: { color: 'bg-red-100 text-red-700', label: '거절' },
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status] ?? { color: 'bg-gray-100 text-gray-600', label: status }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {config.label}
    </span>
  )
}
