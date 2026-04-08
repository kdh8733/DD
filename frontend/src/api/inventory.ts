import client from './client'
import type { InventoryGroup, Host } from '@/types'

export async function fetchGroups(): Promise<InventoryGroup[]> {
  const { data } = await client.get<InventoryGroup[]>('/api/inventory/groups')
  return data
}

export async function fetchGroup(name: string): Promise<InventoryGroup> {
  const { data } = await client.get<InventoryGroup>(`/api/inventory/groups/${name}`)
  return data
}

export async function searchHosts(query: string): Promise<Host[]> {
  const { data } = await client.get<Host[]>('/api/inventory/hosts', { params: { q: query } })
  return data
}

export async function triggerSync(): Promise<void> {
  await client.post('/api/inventory/sync')
}
