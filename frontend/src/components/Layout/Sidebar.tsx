import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useUIStore } from '@/stores/uiStore'

interface NavItem {
  label: string
  path: string
  icon: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '메인',
    items: [
      { label: '대시보드', path: '/', icon: '◫' },
      { label: '배포실행', path: '/deploy', icon: '▶' },
      { label: '실행이력', path: '/history', icon: '≡' },
    ],
  },
  {
    title: '워크플로우',
    items: [
      { label: '승인대기', path: '/approval', icon: '✓' },
      { label: '워크플로우', path: '/workflow', icon: '⤳' },
      { label: '셀프서비스', path: '/self-service', icon: '⊞' },
    ],
  },
  {
    title: '인프라',
    items: [
      { label: '인벤토리', path: '/inventory', icon: '☰' },
      { label: '플레이북', path: '/playbooks', icon: '⊡' },
      { label: '워커노드', path: '/workers', icon: '◉' },
    ],
  },
  {
    title: '관리',
    items: [
      { label: '알림센터', path: '/alerts', icon: '⚡' },
      { label: '권한관리', path: '/rbac', icon: '⊛' },
      { label: '설정', path: '/settings', icon: '⚙' },
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
        'h-screen bg-sidebar-bg flex flex-col transition-all duration-200 border-r border-sidebar-border',
        collapsed ? 'w-[60px]' : 'w-56',
      )}
    >
      {/* 로고 */}
      <div className={clsx(
        'flex items-center h-14 border-b border-sidebar-border flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}>
        {!collapsed && (
          <span className="text-white font-bold text-base tracking-tight">Dook-Dak</span>
        )}
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
          aria-label="사이드바 접기"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            {collapsed
              ? <path d="M6 2L10 8L6 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              : <path d="M10 2L6 8L10 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            }
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-1">
            {!collapsed && (
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={clsx(
                    'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-brand/15 text-brand font-medium'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover',
                  )}
                >
                  <span className={clsx('text-base leading-none flex-shrink-0', collapsed && 'mx-auto')}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
