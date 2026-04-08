import client from './client'
import type { Playbook } from '@/types'

export async function fetchPlaybooks(): Promise<Playbook[]> {
  const { data } = await client.get<Playbook[]>('/api/playbooks')
  return data
}

export async function fetchPlaybook(name: string): Promise<Playbook> {
  const { data } = await client.get<Playbook>(`/api/playbooks/${name}`)
  return data
}
