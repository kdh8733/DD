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
        <div key={approval.id} className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                Job #{approval.job_id} — {approval.job?.playbook ?? ''}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                요청자: {approval.requested_by} · {approval.created_at}
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
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <input
                type="text"
                placeholder="코멘트 (선택)"
                value={comment[approval.id] ?? ''}
                onChange={(e) => setComment((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                className="flex-1"
              />
              <button
                onClick={() => approveMutation.mutate({ id: approval.id, comment: comment[approval.id] })}
                disabled={approveMutation.isPending}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: approval.id, comment: comment[approval.id] })}
                disabled={rejectMutation.isPending}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                거절
              </button>
            </div>
          )}
        </div>
      ))}

      {(!data || data.data.length === 0) && (
        <div className="card py-16 text-center text-sm text-gray-400">승인 대기 중인 항목이 없습니다</div>
      )}
    </div>
  )
}
