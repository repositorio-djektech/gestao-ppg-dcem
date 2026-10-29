import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import { Loader2 } from 'lucide-react'

export function Layout() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true
  })

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
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-100/70 dark:bg-neutral-950">
      {/* Sidebar lateral com borda direita */}
      <AppSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-hidden">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        {/* Área interna de conteúdo: fundo com contraste suave e sombra sutil para destaque */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 shadow-inner flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
      {/* Banner discreto e elegante de instalação PWA */}
      <PwaInstallPrompt />
    </div>
  )
}

export default Layout
