import { useQuery } from '@tanstack/react-query'
import { fetchJob } from '@/api/jobs'

export function useJobStatus(jobId: number | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' ? 2000 : false
    },
  })
}
