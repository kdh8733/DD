import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWorkflows, triggerWorkflow } from '@/api/workflows'
import WorkflowPipeline from '@/components/WorkflowPipeline/WorkflowPipeline'

export default function Workflow() {
  const queryClient = useQueryClient()

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  })

  const triggerMutation = useMutation({
    mutationFn: triggerWorkflow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })

  return (
    <div className="space-y-4">
      {workflows?.map((wf) => (
        <div key={wf.id} className="bg-white rounded-lg border p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{wf.name}</h3>
              <p className="text-sm text-gray-500">{wf.description}</p>
            </div>
            <button
              onClick={() => triggerMutation.mutate(wf.id)}
              disabled={triggerMutation.isPending}
              className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50"
            >
              실행
            </button>
          </div>
          <WorkflowPipeline steps={wf.definition.steps} />
          <div className="text-xs text-gray-400 mt-2">
            상태: {wf.status} | 트리거: {wf.triggered_by} | {wf.created_at}
          </div>
        </div>
      ))}

      {(!workflows || workflows.length === 0) && (
        <div className="text-center py-12 text-gray-400">등록된 워크플로우가 없습니다</div>
      )}
    </div>
  )
}
