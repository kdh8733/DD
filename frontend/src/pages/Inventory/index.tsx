import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGroups, triggerSync } from '@/api/inventory'
import clsx from 'clsx'

export default function Inventory() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['inventory-groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 60 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-groups'] }),
  })

  const filtered = groups?.filter((g) =>
    g.group.toLowerCase().includes(search.toLowerCase()) ||
    g.platform.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="그룹 / 플랫폼 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-primary"
        >
          {syncMutation.isPending ? '동기화 중...' : '인벤토리 동기화'}
        </button>
      </div>

      <div className="space-y-2">
        {filtered?.map((group) => (
          <div key={group.group} className="card overflow-hidden">
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.group ? null : group.group)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-gray-900">{group.group}</span>
                <span className="text-sm text-gray-500 ml-3">{group.platform} · {group.environment} · {group.dc}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{group.hosts.length} hosts</span>
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className={clsx('transition-transform', expandedGroup === group.group && 'rotate-180')}
                >
                  <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </button>

            {expandedGroup === group.group && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">호스트</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">OS</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">최근 배포</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* TODO: 대규모 호스트 목록을 위한 react-virtual 적용 */}
                    {group.hosts.map((host) => (
                      <tr key={host.hostname} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 font-mono text-gray-700">{host.hostname}</td>
                        <td className="px-5 py-2.5 font-mono text-gray-500">{host.ip}</td>
                        <td className="px-5 py-2.5 text-gray-600">{host.os}</td>
                        <td className="px-5 py-2.5">
                          <span className={clsx(
                            'inline-block w-2 h-2 rounded-full mr-2',
                            host.status === 'active' && 'bg-green-500',
                            host.status === 'error' && 'bg-red-500',
                            host.status === 'maintenance' && 'bg-yellow-500',
                          )} />
                          <span className="text-gray-600">{host.status}</span>
                        </td>
                        <td className="px-5 py-2.5 text-gray-400">{host.last_deployed ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
