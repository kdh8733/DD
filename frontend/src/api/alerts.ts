import client from './client'
import type { Alert } from '@/types'

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await client.get<Alert[]>('/api/alerts')
  return data
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await client.post(`/api/alerts/${id}/ack`)
}
