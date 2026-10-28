import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoP2cem from '@/assets/logo-p2cem.png'
import p2cemUfs from '@/assets/p2cem-ufs.png'
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  AlertTriangle,
  Award,
  BarChart3,
  Users,
  UserCog,
  GraduationCap,
  UserCheck,
  ClipboardList,
  BookUser,
  Library,
  GitFork,
  FlaskConical,
  FolderOpen,
  FileText,
  Wrench,
  Lightbulb,
  Calendar,
  Plane,
  HeartHandshake,
  Trophy,
  LogOut,
} from 'lucide-react'

export const Logo = () => {
  return (
    <Link
      to="/"
      className="flex items-center justify-start py-1 relative z-20 min-w-0 w-full"
      title="P²CEM / UFS"
    >
      <img
        src={p2cemUfs}
        alt="P²CEM - UFS"
        className="h-10 max-h-11 w-auto max-w-full object-contain shrink-0"
      />
    </Link>
  )
}

export const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="flex items-center justify-center py-1 relative z-20 w-full"
      title="P²CEM"
    >
      <img src={logoP2cem} alt="P²CEM" className="h-9 w-9 object-contain shrink-0" />
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
      {
        label: 'Lacunas',
        href: '/lacunas',
        icon: <AlertTriangle className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Recondução',
        href: '/reconducao',
        icon: <Award className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Indicadores',
        href: '/indicadores',
        icon: <BarChart3 className="h-5 w-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Pessoas',
    items: [
      {
        label: 'Docentes',
        href: '/docentes',
        icon: <GraduationCap className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Discentes',
        href: '/discentes',
        icon: <Users className="h-5 w-5 shrink-0" />,
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
        label: 'Orientações',
        href: '/orientacoes',
        icon: <BookUser className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Iniciação Científica',
        href: '/iniciacao-cientifica',
        icon: <FlaskConical className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Disciplinas',
        href: '/disciplinas',
        icon: <Library className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Linhas de Pesquisa',
        href: '/linhas-pesquisa',
        icon: <GitFork className="h-5 w-5 shrink-0" />,
      },
      {
        label: 'Projetos de Pesquisa',
        href: '/projetos-pesquisa',
        icon: <FolderOpen className="h-5 w-5 shrink-0" />,
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
        icon: <Trophy className="h-5 w-5 shrink-0" />,
      },
    ],
  },
]

interface SidebarContentProps {
  onNavigate?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  suporte: 'Suporte',
  coordenador: 'Coordenador',
  auxiliar: 'Auxiliar',
  docente: 'Docente',
  capes: 'CAPES',
}

function SidebarContentWithSections({ onNavigate }: SidebarContentProps = {}) {
  const { open } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, role, isSuporte, isCoordenador, signOut } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Apenas 'suporte' e 'coordenador' têm acesso ao módulo administrativo de Gestão de Usuários
  const podeAcessarUsuarios = isSuporte || isCoordenador

  // Clona as seções injetando condicionalmente a seção/item de Usuários no grupo Pessoas
  const visibleSections = navSections.map((section) => {
    if (section.title === 'Pessoas' && podeAcessarUsuarios) {
      return {
        ...section,
        items: [
          ...section.items,
          {
            label: 'Usuários',
            href: '/usuarios',
            icon: <UserCog className="h-5 w-5 shrink-0" />,
          },
        ],
      }
    }
    return section
  })

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
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 min-h-0 sidebar-scrollbar [scrollbar-gutter:auto]">
        {/* Grupos de navegação — gap-6 quando fechada (+50% vs gap-4 quando aberta) */}
        <div className={cn('flex flex-col transition-all duration-150', open ? 'gap-4' : 'gap-6')}>
          {visibleSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1 items-stretch">
              {open && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 px-2 pt-1 truncate">
                  {section.title}
                </span>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.href
                const linkElement = (
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

                // Quando a sidebar estiver FECHADA no desktop, exibe tooltip com a label do item no hover
                if (!open) {
                  return (
                    <Tooltip key={item.href} delayDuration={150}>
                      <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        align="center"
                        sideOffset={8}
                        className="hidden lg:block z-[110] bg-blue-950 text-blue-50 text-xs px-2.5 py-1 rounded-md shadow-md border border-blue-800/80 font-medium select-none pointer-events-none"
                      >
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return linkElement
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
          <button
            type="button"
            onClick={() => {
              if (profile?.docente_id) {
                navigate('/docentes?solicitar-edicao-propria=1')
              } else {
                navigate('/docentes')
              }
            }}
            className={cn(
              'flex items-center gap-2 min-w-0 flex-1 rounded-md p-1 -m-1 text-left cursor-pointer transition-colors',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              !open && 'justify-center',
            )}
            title={
              profile?.docente_id ? 'Editar meus dados de docente' : (profile?.name ?? 'Usuário')
            }
          >
            <Avatar className="h-7 w-7 border border-neutral-200 dark:border-neutral-700 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {profile?.name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
            {open && (
              <div className="flex flex-col items-start gap-0.5 overflow-hidden text-left min-w-0 flex-1">
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate w-full">
                  {profile?.name ?? 'Usuário'}
                </span>
                {role && (
                  <span className="inline-flex self-start items-center text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 leading-none">
                    {ROLE_LABELS[role] || role}
                  </span>
                )}
              </div>
            )}
          </button>

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
  const [internalOpen, setInternalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true
  })
  const open = openProp !== undefined ? openProp : internalOpen
  const setOpen = setOpenProp !== undefined ? setOpenProp : setInternalOpen

  const handleNavigate = () => {
    // No mobile (< 1024px), fecha o drawer overlay ao clicar no item.
    // No desktop (>= 1024px), preserva o estado aberto da sidebar (não fecha).
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setOpen(false)
    }
  }

  return (
    <Sidebar open={open} setOpen={setOpen}>
      {/* Sidebar com borda vertical nítida à direita e leve sombra */}
      <SidebarBody className="bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-sm">
        <SidebarContentWithSections onNavigate={handleNavigate} />
      </SidebarBody>
    </Sidebar>
  )
}

export default AppSidebar
