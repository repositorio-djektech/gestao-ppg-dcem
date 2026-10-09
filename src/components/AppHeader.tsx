import { Button } from '@/components/ui/button'
import { Search, PanelLeftClose, PanelLeftOpen, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AppHeaderProps {
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function AppHeader({ onToggleSidebar, sidebarOpen }: AppHeaderProps = {}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-white dark:bg-neutral-900 px-3 sm:px-4 md:px-6 z-10 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
        {/* Toggle da sidebar no HEADER, do lado ESQUERDO do campo de busca (desktop e mobile) */}
        {onToggleSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-9 w-9 shrink-0 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            title={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
            aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Campo de pesquisa */}
        <div className="flex items-center relative w-full max-w-[200px] sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Pesquisar..."
            className="w-full bg-slate-50 dark:bg-neutral-800 pl-9 rounded-full border-slate-200 dark:border-neutral-700 focus-visible:ring-primary/20 text-sm h-9"
          />
        </div>
      </div>

      {/* Extremidade DIREITA do header: Badge "2025 - 2028" com a MESMA UI do badge de Scopus ID (cor azul primária + ícone Calendar) */}
      <div className="flex items-center shrink-0">
        <Badge
          variant="secondary"
          className="font-mono text-xs sm:text-sm px-2.5 sm:px-3 py-1 bg-primary/10 text-primary border border-primary/25 rounded-md flex items-center gap-1.5 shadow-xs select-none font-medium"
          title="Quadriênio de Avaliação CAPES"
        >
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>2025 - 2028</span>
        </Badge>
      </div>
    </header>
  )
}
