import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, BookOpen, Plane, Calendar, Lightbulb } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Docentes', url: '/docentes', icon: Users },
  { title: 'Publicações', url: '/publicacoes', icon: BookOpen },
  { title: 'Mobilidade', url: '/mobilidade', icon: Plane },
  { title: 'Eventos', url: '/eventos', icon: Calendar },
  { title: 'Patentes', url: '/patentes', icon: Lightbulb },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-6 bg-slate-50">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <span>Gestão PPG Web</span>
        </h2>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 p-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 data-[active=true]:bg-primary/10 data-[active=true]:text-primary font-medium"
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
      </SidebarContent>
    </Sidebar>
  )
}
