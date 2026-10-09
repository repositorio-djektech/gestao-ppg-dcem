import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import dcemLogo from '@/assets/dcem-logo-trans-3d28d.webp'
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
      className="font-normal flex items-center gap-2 py-1 relative z-20 text-neutral-900 dark:text-neutral-100"
    >
      <img src={dcemLogo} alt="DCEM Logo" className="h-7 w-7 object-contain shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-primary text-sm whitespace-pre tracking-tight"
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

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="mb-4">{open ? <Logo /> : <LogoIcon />}</div>

        <div className="flex flex-col gap-4">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              {open && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 px-2 pt-1">
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
                      'rounded-md px-2 py-1.5 transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold [&_svg]:text-primary'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-700/60 [&_svg]:text-neutral-600 dark:[&_svg]:text-neutral-300',
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex flex-col gap-1">
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer',
            !open && 'justify-center',
          )}
          title={`${profile?.name ?? 'Usuário'} (${profile?.email ?? ''})`}
        >
          <Avatar className="h-7 w-7 border border-neutral-300 dark:border-neutral-600 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {profile?.name?.charAt(0) ?? 'U'}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex flex-col overflow-hidden text-left flex-1 min-w-0">
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                {profile?.name ?? 'Usuário'}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                {profile?.email ?? ''}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left',
            !open && 'justify-center',
          )}
          title="Sair da conta"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {open && <span className="text-xs font-medium">Sair da conta</span>}
        </button>
      </div>
    </>
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
      <SidebarBody className="justify-between gap-4 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
        <SidebarContentWithSections onNavigate={() => setOpen(false)} />
      </SidebarBody>
    </Sidebar>
  )
}

export default AppSidebar
