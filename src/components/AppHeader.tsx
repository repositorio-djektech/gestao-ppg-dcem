import useAuthStore from '@/stores/useAuthStore'
import { SidebarTrigger } from '@/components/ui/sidebar'
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
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function AppHeader() {
  const { user, logout } = useAuthStore()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-slate-500 hover:text-primary" />
        <div className="hidden md:flex items-center relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Pesquisar..."
            className="w-full bg-slate-50 pl-9 rounded-full border-slate-200 focus-visible:ring-primary/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100">
              <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {user?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none text-slate-900">{user?.name}</p>
                <p className="text-xs leading-none text-slate-500">{user?.email}</p>
                <div>
                  <Badge
                    variant="secondary"
                    className="capitalize bg-slate-100 text-slate-700 font-medium"
                  >
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer font-medium"
            >
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
