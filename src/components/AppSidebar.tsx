import { Link, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'

const navGroups = [
  {
    label: 'Pessoas',
    items: [
      { title: 'Docentes', url: '/docentes', icon: Users },
      { title: 'Discentes', url: '/discentes', icon: GraduationCap },
      { title: 'Egressos', url: '/egressos', icon: UserCheck },
    ],
  },
  {
    label: 'Acadêmico',
    items: [
      { title: 'Bancas', url: '/bancas', icon: ClipboardList },
      { title: 'Orientações', url: '/orientacoes', icon: Users2 },
      { title: 'Disciplinas', url: '/disciplinas', icon: Library },
      { title: 'Projetos de Pesquisa', url: '/projetos-pesquisa', icon: FlaskConical },
    ],
  },
  {
    label: 'Produção',
    items: [
      { title: 'Publicações', url: '/publicacoes', icon: FileText },
      { title: 'Produção Técnica', url: '/producao-tecnica', icon: Wrench },
      { title: 'Patentes', url: '/patentes', icon: Lightbulb },
    ],
  },
  {
    label: 'Difusão/Outros',
    items: [
      { title: 'Eventos', url: '/eventos', icon: Calendar },
      { title: 'Mobilidade', url: '/mobilidade', icon: Plane },
      { title: 'Impacto Social', url: '/impacto-social', icon: HeartHandshake },
      { title: 'Premiações', url: '/premiacoes', icon: Award },
    ],
  },
]

const menuButtonClass =
  'text-slate-600 hover:text-slate-900 hover:bg-slate-100 data-[active=true]:bg-primary/10 data-[active=true]:text-primary font-medium'

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-6 bg-slate-50">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          <span>Gestão PPG DCEM</span>
        </h2>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 p-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/'}
                  className={menuButtonClass}
                >
                  <Link to="/">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-2 pb-2">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className={menuButtonClass}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4 mr-2" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
