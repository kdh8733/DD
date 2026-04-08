import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApprovals, approveJob, rejectJob } from '@/api/approvals'
import StatusBadge from '@/components/StatusBadge/StatusBadge'

export default function Approval() {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState<Record<number, string>>({})

  const { data } = useQuery({
    queryKey: ['approvals'],
    queryFn: fetchApprovals,
    refetchInterval: 10000,
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) => approveJob(id, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) => rejectJob(id, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  })

  return (
    <div className="space-y-4">
      {data?.data.map((approval) => (
        <div key={approval.id} className="bg-white rounded-lg border p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                Job #{approval.job_id} — {approval.job?.playbook ?? ''}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                요청자: {approval.requested_by} | {approval.created_at}
              </p>
            </div>
            <StatusBadge status={approval.status} />
          </div>

          {approval.diff_preview && (
            <pre className="bg-gray-900 text-gray-300 rounded-lg p-4 text-xs font-mono overflow-x-auto mb-4 max-h-60 overflow-y-auto">
              {approval.diff_preview}
            </pre>
          )}

          {approval.status === 'pending' && (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="코멘트 (선택)"
                value={comment[approval.id] ?? ''}
                onChange={(e) => setComment((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => approveMutation.mutate({ id: approval.id, comment: comment[approval.id] })}
                disabled={approveMutation.isPending}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: approval.id, comment: comment[approval.id] })}
                disabled={rejectMutation.isPending}
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          )}
        </div>
      ))}

      {(!data || data.data.length === 0) && (
        <div className="text-center py-12 text-gray-400">승인 대기 중인 항목이 없습니다</div>
      )}
    </div>
  )
}
