import { Outlet, Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function Layout() {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 w-full">
        <Outlet />
      </main>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
