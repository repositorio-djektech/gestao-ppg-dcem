import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import dcemLogo from '@/assets/dcem-logo-trans-3d28d.webp'
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCheck,
  ClipboardList,
  Users2,
  Library,
  FlaskConical,
  FileText,
  Wrench,
  Lightbulb,
  Calendar,
  Plane,
  HeartHandshake,
  Award,
  LogOut,
} from 'lucide-react'

export const Logo = () => {
  return (
    <Link
      to="/"
      className="font-normal flex items-center gap-2 py-1 relative z-20 text-neutral-900 dark:text-neutral-100 min-w-0"
    >
      <img src={dcemLogo} alt="DCEM Logo" className="h-7 w-7 object-contain shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-primary text-sm whitespace-pre tracking-tight truncate"
      >
        Gestão PPG-DCEM
      </motion.span>
    </Link>
  )
}

export const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="font-normal flex items-center justify-center py-1 relative z-20"
      title="Gestão PPG-DCEM"
    >
      <img src={dcemLogo} alt="DCEM Logo" className="h-7 w-7 object-contain shrink-0" />
    </Link>
  )
}

interface NavSection {
  title: string
  items: {
    label: string
    href: string
    icon: React.ReactNode
  }[]
}

const navSections: NavSection[] = [
  {
    title: 'Geral',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: <LayoutDashboard className="h-5 w-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Pessoas',
    items: [
      {
        label: 'Docentes',
        href: '/docentes',
        icon: <Users className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Discentes',
        href: '/discentes',
        icon: <GraduationCap className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Egressos',
        href: '/egressos',
        icon: <UserCheck className="h-5 w-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Acadêmico',
    items: [
      {
        label: 'Bancas',
        href: '/bancas',
        icon: <ClipboardList className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Orientações',
        href: '/orientacoes',
        icon: <Users2 className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Disciplinas',
        href: '/disciplinas',
        icon: <Library className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Projetos de Pesquisa',
        href: '/projetos-pesquisa',
        icon: <FlaskConical className="h-5 w-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Produção',
    items: [
      {
        label: 'Publicações',
        href: '/publicacoes',
        icon: <FileText className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Produção Técnica',
        href: '/producao-tecnica',
        icon: <Wrench className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Patentes',
        href: '/patentes',
        icon: <Lightbulb className="h-5 w-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Difusão/Outros',
    items: [
      {
        label: 'Eventos',
        href: '/eventos',
        icon: <Calendar className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Mobilidade',
        href: '/mobilidade',
        icon: <Plane className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Impacto Social',
        href: '/impacto-social',
        icon: <HeartHandshake className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Premiações',
        href: '/premiacoes',
        icon: <Award className="h-5 w-5 shrink-0" />,
      },
    ],
  },
]

interface SidebarContentProps {
  onNavigate?: () => void
}

function SidebarContentWithSections({ onNavigate }: SidebarContentProps = {}) {
  const { open } = useSidebar()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Cabeçalho fixo da Sidebar com a mesma altura e linha horizontal que o AppHeader (h-16) */}
      <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0 bg-inherit flex items-center px-2">
        <div
          className={cn(
            'flex items-center min-w-0 w-full',
            open ? 'justify-start px-1.5' : 'justify-center',
          )}
        >
          {open ? <Logo /> : <LogoIcon />}
        </div>
      </div>

      {/* Navegação rolável: apenas a lista de links tem scroll vertical */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 min-h-0">
        {/* Grupos de navegação — gap-6 quando fechada (+50% vs gap-4 quando aberta) */}
        <div className={cn('flex flex-col transition-all duration-150', open ? 'gap-4' : 'gap-6')}>
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1 items-stretch">
              {open && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 px-2 pt-1 truncate">
                  {section.title}
                </span>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <SidebarLink
                    key={item.href}
                    link={item}
                    onClick={() => {
                      if (onNavigate) onNavigate()
                    }}
                    className={cn(
                      'rounded-md transition-all select-none',
                      // no estado recolhido, o highlight envolve todo o ícone regularmente (w-8 h-8 rounded-md mx-auto)
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold [&_svg]:text-primary'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800 [&_svg]:text-neutral-600 dark:[&_svg]:text-neutral-300',
                      !open && 'w-8 h-8 !p-0 mx-auto justify-center',
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé alinhado em linha única — avatar/dados + botão de LogOut à direita */}
      <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 shrink-0 bg-inherit">
        <div
          className={cn(
            'flex items-center gap-2 rounded-md',
            open ? 'justify-between px-1.5 py-1' : 'flex-col justify-center gap-2',
          )}
        >
          {/* Identificação do Usuário */}
          <div
            className={cn('flex items-center gap-2 min-w-0 flex-1', !open && 'justify-center')}
            title={`${profile?.name ?? 'Usuário'} (${profile?.email ?? ''})`}
          >
            <Avatar className="h-7 w-7 border border-neutral-200 dark:border-neutral-700 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {profile?.name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
            {open && (
              <div className="flex flex-col overflow-hidden text-left min-w-0 flex-1">
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {profile?.name ?? 'Usuário'}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {profile?.email ?? ''}
                </span>
              </div>
            )}
          </div>

          {/* Botão de SAIR: apenas ícone LogOut alinhado à direita na mesma linha */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              'p-1.5 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0 flex items-center justify-center',
              !open && 'w-8 h-8',
            )}
            title="Sair do sistema"
            aria-label="Sair do sistema"
          >
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Modal de confirmação de saída */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do sistema?</AlertDialogTitle>
            <AlertDialogDescription>Você será desconectado da sua conta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutModal(false)
                signOut()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface AppSidebarProps {
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
}

export function AppSidebar({ open: openProp, setOpen: setOpenProp }: AppSidebarProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp !== undefined ? openProp : internalOpen
  const setOpen = setOpenProp !== undefined ? setOpenProp : setInternalOpen

  return (
    <Sidebar open={open} setOpen={setOpen}>
      {/* Sidebar com borda vertical nítida à direita e leve sombra */}
      <SidebarBody className="bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-sm">
        <SidebarContentWithSections onNavigate={() => setOpen(false)} />
      </SidebarBody>
    </Sidebar>
  )
}

export default AppSidebar
