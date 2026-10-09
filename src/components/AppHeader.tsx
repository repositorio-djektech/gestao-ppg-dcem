import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, LogOut, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AppHeaderProps {
  onToggleSidebar?: () => void
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps = {}) {
  const { profile, signOut } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-white dark:bg-neutral-900 px-3 sm:px-4 md:px-6 z-10 border-b border-neutral-100 dark:border-neutral-800/60 shadow-xs">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
        <div className="flex items-center">
          {/* Badge de Quadriênio CAPES no canto esquerdo do header (Item 7) */}
          <Badge
            variant="default"
            className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs select-none shrink-0"
          >
            2025 - 2028
          </Badge>
        </div>

        {onToggleSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden h-9 w-9 shrink-0 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center relative w-full max-w-[200px] sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Pesquisar..."
            className="w-full bg-slate-50 dark:bg-neutral-800 pl-9 rounded-full border-slate-200 dark:border-neutral-700 focus-visible:ring-primary/20 text-sm h-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100">
              <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profile?.name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none text-slate-900">
                  {profile?.name ?? 'Usuário'}
                </p>
                <p className="text-xs leading-none text-slate-500">{profile?.email ?? ''}</p>
                <div>
                  <Badge
                    variant="secondary"
                    className="capitalize bg-slate-100 text-slate-700 font-medium"
                  >
                    {profile?.role ?? 'viewer'}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive cursor-pointer font-medium"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
