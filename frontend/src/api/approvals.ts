import client from './client'
import type { Approval, PaginatedResponse } from '@/types'

export async function fetchApprovals(): Promise<PaginatedResponse<Approval>> {
  const { data } = await client.get<PaginatedResponse<Approval>>('/api/approvals')
  return data
}

export async function approveJob(id: number, comment?: string): Promise<void> {
  await client.post(`/api/approvals/${id}/approve`, { comment })
}

export async function rejectJob(id: number, comment?: string): Promise<void> {
  await client.post(`/api/approvals/${id}/reject`, { comment })
}
