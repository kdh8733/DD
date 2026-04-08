import client from './client'
import type { WorkerNode, QueueStats } from '@/types'

export async function fetchWorkers(): Promise<WorkerNode[]> {
  const { data } = await client.get<WorkerNode[]>('/api/workers')
  return data
}

export async function fetchQueueStats(): Promise<QueueStats> {
  const { data } = await client.get<QueueStats>('/api/workers/queue-stats')
  return data
}
