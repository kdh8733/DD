import { useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: '대시보드', description: '배포 현황 한눈에 보기' },
  '/deploy': { title: '배포실행', description: '새 배포 작업 생성' },
  '/history': { title: '실행이력', description: '배포 실행 기록 조회' },
  '/approval': { title: '승인대기', description: '승인 요청 관리' },
  '/workflow': { title: '워크플로우', description: '배포 워크플로우 관리' },
  '/self-service': { title: '셀프서비스', description: '셀프서비스 카탈로그' },
  '/inventory': { title: '인벤토리', description: '서버 인벤토리 관리' },
  '/playbooks': { title: '플레이북', description: 'Ansible 플레이북 관리' },
  '/workers': { title: '워커노드', description: '워커 노드 모니터링' },
  '/alerts': { title: '알림센터', description: '알림 및 이벤트 관리' },
  '/rbac': { title: '권한관리', description: '역할 기반 접근 제어' },
  '/settings': { title: '설정', description: '시스템 설정' },
}

export default function Header() {
  const location = useLocation()
  const notifications = useUIStore((s) => s.notifications)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const page = pageTitles[location.pathname] ?? { title: '', description: '' }

  return (
    <header className="h-14 bg-white border-b border-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">{page.title}</h1>
        <p className="text-xs text-gray-400 leading-tight">{page.description}</p>
      </div>

      <div className="flex items-center gap-5">
        {/* 알림 */}
        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-medium">
              {notifications.length}
            </span>
          )}
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-gray-200" />

        {/* 사용자 */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-xs flex-shrink-0">
              {user.name[0]}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-800 leading-tight">{user.name}</div>
              <div className="text-xs text-gray-400 leading-tight">{user.roles.join(', ')}</div>
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
