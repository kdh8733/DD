import client from './client'
import type { Job, JobResult, CreateJobRequest, PaginatedResponse } from '@/types'

export interface JobFilter {
  status?: string
  playbook?: string
  platform?: string
  environment?: string
  limit?: number
  offset?: number
  start_date?: string
  end_date?: string
}

export async function fetchJobs(filter: JobFilter = {}): Promise<PaginatedResponse<Job>> {
  const { data } = await client.get<PaginatedResponse<Job>>('/api/jobs', { params: filter })
  return data
}

export async function fetchJob(id: number): Promise<Job> {
  const { data } = await client.get<Job>(`/api/jobs/${id}`)
  return data
}

export async function createJob(req: CreateJobRequest): Promise<Job> {
  const { data } = await client.post<Job>('/api/jobs', req)
  return data
}

export async function cancelJob(id: number): Promise<void> {
  await client.post(`/api/jobs/${id}/cancel`)
}

export async function fetchJobResults(id: number): Promise<JobResult[]> {
  const { data } = await client.get<JobResult[]>(`/api/jobs/${id}/results`)
  return data
}
