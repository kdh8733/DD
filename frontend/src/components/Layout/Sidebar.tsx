import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useUIStore } from '@/stores/uiStore'

interface NavItem {
  label: string
  path: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '메인',
    items: [
      { label: '대시보드', path: '/' },
      { label: '배포실행', path: '/deploy' },
      { label: '실행이력', path: '/history' },
    ],
  },
  {
    title: '워크플로우',
    items: [
      { label: '승인대기', path: '/approval' },
      { label: '워크플로우', path: '/workflow' },
      { label: '셀프서비스', path: '/self-service' },
    ],
  },
  {
    title: '인프라',
    items: [
      { label: '인벤토리', path: '/inventory' },
      { label: '플레이북', path: '/playbooks' },
      { label: '워커노드', path: '/workers' },
    ],
  },
  {
    title: '관리',
    items: [
      { label: '알림센터', path: '/alerts' },
      { label: '권한관리', path: '/rbac' },
      { label: '설정', path: '/settings' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      className={clsx(
        'h-screen bg-sidebar-bg border-r border-sidebar-border flex flex-col transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        {!collapsed && <span className="text-white font-bold text-lg">Dook-Dak</span>}
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
          {collapsed ? '>>' : '<<'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center px-4 py-2 text-sm transition-colors',
                    active
                      ? 'text-white bg-brand/20 border-r-2 border-brand'
                      : 'text-gray-400 hover:text-white hover:bg-sidebar-hover',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={clsx(collapsed && 'mx-auto')}>{collapsed ? item.label[0] : item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
