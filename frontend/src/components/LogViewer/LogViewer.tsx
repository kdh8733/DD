import { useEffect, useRef } from 'react'
import { useJobLogs } from '@/hooks/useJobLogs'
import clsx from 'clsx'

interface LogViewerProps {
  jobId: number
  maxHeight?: string
}

function classifyLine(line: string): string {
  if (line.includes('ok:') || line.includes('SUCCESS')) return 'text-green-400'
  if (line.includes('changed:')) return 'text-yellow-400'
  if (line.includes('fatal:') || line.includes('FAILED')) return 'text-red-400'
  if (line.includes('skipping:')) return 'text-gray-400'
  if (line.includes('TASK') || line.includes('PLAY')) return 'text-blue-400'
  return 'text-gray-300'
}

export default function LogViewer({ jobId, maxHeight = '600px' }: LogViewerProps) {
  const { logs, status } = useJobLogs(jobId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
        <span>Job #{jobId}</span>
        <span className="capitalize">{status}</span>
        {status === 'running' && <span className="animate-pulse text-brand">●</span>}
      </div>
      <div
        className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-y-auto"
        style={{ maxHeight }}
      >
        {logs.map((line, i) => (
          <div key={i} className={clsx('whitespace-pre-wrap leading-relaxed', classifyLine(line))}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
