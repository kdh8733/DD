import { useEffect, useRef, useState } from 'react'
import type { JobStatus, LogMessage } from '@/types'

export function useJobLogs(jobId: number | null) {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<JobStatus>('queued')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!jobId) return

    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080'}/ws/jobs/${jobId}/logs`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as LogMessage
      if (msg.type === 'log') setLogs((prev) => [...prev, msg.content])
      if (msg.type === 'status') setStatus(msg.content as JobStatus)
    }

    wsRef.current = ws
    return () => ws.close()
  }, [jobId])

  return { logs, status }
}
