import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlaybooks } from '@/api/playbooks'

export default function Playbooks() {
  const [platformFilter, setPlatformFilter] = useState<string>('')

  const { data: playbooks } = useQuery({
    queryKey: ['playbooks'],
    queryFn: fetchPlaybooks,
  })

  const platforms = [...new Set(playbooks?.map((p) => p.platform) ?? [])]
  const filtered = platformFilter
    ? playbooks?.filter((p) => p.platform === platformFilter)
    : playbooks

  return (
    <div className="space-y-4">
      {/* 플랫폼 필터 탭 */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setPlatformFilter('')}
          className={`px-3 py-1 rounded-lg text-sm ${!platformFilter ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          전체
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`px-3 py-1 rounded-lg text-sm ${platformFilter === p ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 플레이북 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((pb) => (
          <div key={pb.name} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{pb.name}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{pb.platform}</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">{pb.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>성공률: {pb.success_rate}%</span>
              <span>마지막 실행: {pb.last_run ?? '-'}</span>
            </div>
            {pb.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {pb.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-12 text-gray-400">플레이북이 없습니다</div>
      )}
    </div>
  )
}
