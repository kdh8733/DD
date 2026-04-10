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
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setPlatformFilter('')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !platformFilter ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              platformFilter === p ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 플레이북 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((pb) => (
          <div key={pb.name} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{pb.name}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md ml-2 flex-shrink-0">{pb.platform}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">{pb.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>성공률: <span className="font-medium text-gray-600">{pb.success_rate}%</span></span>
              <span>마지막 실행: {pb.last_run ?? '-'}</span>
            </div>
            {pb.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                {pb.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="card py-16 text-center text-sm text-gray-400">플레이북이 없습니다</div>
      )}
    </div>
  )
}
