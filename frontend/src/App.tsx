import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import AppLayout from '@/components/Layout/AppLayout'
import AuthGuard from '@/components/AuthGuard'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Deploy = lazy(() => import('@/pages/Deploy'))
const History = lazy(() => import('@/pages/History'))
const Approval = lazy(() => import('@/pages/Approval'))
const Workflow = lazy(() => import('@/pages/Workflow'))
const SelfService = lazy(() => import('@/pages/SelfService'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Playbooks = lazy(() => import('@/pages/Playbooks'))
const Workers = lazy(() => import('@/pages/Workers'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const RBAC = lazy(() => import('@/pages/RBAC'))
const Settings = lazy(() => import('@/pages/Settings'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Suspense fallback={<Loading />}><Dashboard /></Suspense>} />
              <Route path="/deploy" element={<Suspense fallback={<Loading />}><Deploy /></Suspense>} />
              <Route path="/history" element={<Suspense fallback={<Loading />}><History /></Suspense>} />
              <Route path="/approval" element={<Suspense fallback={<Loading />}><Approval /></Suspense>} />
              <Route path="/workflow" element={<Suspense fallback={<Loading />}><Workflow /></Suspense>} />
              <Route path="/self-service" element={<Suspense fallback={<Loading />}><SelfService /></Suspense>} />
              <Route path="/inventory" element={<Suspense fallback={<Loading />}><Inventory /></Suspense>} />
              <Route path="/playbooks" element={<Suspense fallback={<Loading />}><Playbooks /></Suspense>} />
              <Route path="/workers" element={<Suspense fallback={<Loading />}><Workers /></Suspense>} />
              <Route path="/alerts" element={<Suspense fallback={<Loading />}><Alerts /></Suspense>} />
              <Route path="/rbac" element={<Suspense fallback={<Loading />}><RBAC /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<Loading />}><Settings /></Suspense>} />
            </Route>
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
