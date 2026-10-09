import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { Loader2 } from 'lucide-react'

export function Layout() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  if (session && location.pathname === '/login') {
    return <Navigate to="/" replace />
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 w-full">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <AppSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-hidden">
        <AppHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
