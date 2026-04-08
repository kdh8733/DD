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
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{page.title}</h1>
        <p className="text-xs text-gray-500">{page.description}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* 알림 벨 */}
        <button className="relative text-gray-500 hover:text-gray-700">
          <span className="text-xl">&#128276;</span>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>

        {/* 사용자 */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">{user.name}</div>
              <div className="text-xs text-gray-400">{user.roles.join(', ')}</div>
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 ml-2"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
