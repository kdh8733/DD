import { create } from 'zustand'
import type { Alert } from '@/types'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  notifications: Alert[]
  addNotification: (alert: Alert) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  notifications: [],
  addNotification: (alert) => set((s) => ({ notifications: [...s.notifications, alert] })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))
