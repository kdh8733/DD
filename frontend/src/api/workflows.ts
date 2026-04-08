import client from './client'
import type { Workflow, WorkflowDefinition } from '@/types'

export async function fetchWorkflows(): Promise<Workflow[]> {
  const { data } = await client.get<Workflow[]>('/api/workflows')
  return data
}

export async function fetchWorkflow(id: number): Promise<Workflow> {
  const { data } = await client.get<Workflow>(`/api/workflows/${id}`)
  return data
}

export async function createWorkflow(payload: { name: string; description: string; definition: WorkflowDefinition }): Promise<Workflow> {
  const { data } = await client.post<Workflow>('/api/workflows', payload)
  return data
}

export async function triggerWorkflow(id: number): Promise<void> {
  await client.post(`/api/workflows/${id}/trigger`)
}
