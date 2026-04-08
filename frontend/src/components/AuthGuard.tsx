import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  children: ReactNode
}

export default function AuthGuard({ children }: Props) {
  useAuth()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">인증 중...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
