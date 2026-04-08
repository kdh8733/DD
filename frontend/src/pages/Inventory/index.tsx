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
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50"
        >
          {syncMutation.isPending ? '동기화 중...' : '인벤토리 동기화'}
        </button>
      </div>

      <div className="space-y-2">
        {filtered?.map((group) => (
          <div key={group.group} className="bg-white rounded-lg border">
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.group ? null : group.group)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div>
                <span className="font-semibold text-gray-900">{group.group}</span>
                <span className="text-sm text-gray-500 ml-3">{group.platform} / {group.environment} / {group.dc}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{group.hosts.length} hosts</span>
                <span>{expandedGroup === group.group ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedGroup === group.group && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-2 text-left">호스트</th>
                      <th className="px-5 py-2 text-left">IP</th>
                      <th className="px-5 py-2 text-left">OS</th>
                      <th className="px-5 py-2 text-left">상태</th>
                      <th className="px-5 py-2 text-left">최근 배포</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* TODO: 대규모 호스트 목록을 위한 react-virtual 적용 */}
                    {group.hosts.map((host) => (
                      <tr key={host.hostname} className="hover:bg-gray-50">
                        <td className="px-5 py-2 font-mono">{host.hostname}</td>
                        <td className="px-5 py-2 font-mono">{host.ip}</td>
                        <td className="px-5 py-2">{host.os}</td>
                        <td className="px-5 py-2">
                          <span className={clsx(
                            'inline-block w-2 h-2 rounded-full mr-1',
                            host.status === 'active' && 'bg-green-500',
                            host.status === 'error' && 'bg-red-500',
                            host.status === 'maintenance' && 'bg-yellow-500',
                          )} />
                          {host.status}
                        </td>
                        <td className="px-5 py-2 text-gray-400">{host.last_deployed ?? '-'}</td>
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
