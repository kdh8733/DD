import { useQuery } from '@tanstack/react-query'
import { fetchGroups } from '@/api/inventory'

export function useInventory() {
  return useQuery({
    queryKey: ['inventory-groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 60 * 1000,
  })
}
