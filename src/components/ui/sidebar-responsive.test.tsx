import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import {
  SidebarProvider,
  MobileSidebar,
  DesktopSidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { AppHeader } from '@/components/AppHeader'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user' } },
    profile: { name: 'Prof. Teste', email: 'teste@ufs.br', role: 'admin' },
    loading: false,
    signOut: vi.fn(),
  }),
}))

describe('Responsividade Sidebar e Header (Mobile e Tablet Portrait)', () => {
  it('1. MobileSidebar não renderiza a barra superior duplicada de 40px quando fechado', () => {
    const html = renderToString(
      <SidebarProvider open={false}>
        <MobileSidebar>
          <div>Conteúdo Drawer</div>
        </MobileSidebar>
      </SidebarProvider>,
    )

    // O MobileSidebar fechado deve renderizar o container responsivo md:hidden
    // mas sem barra superior verde/cinza invasiva h-10 w-full com Menu duplicado
    expect(html).toContain('md:hidden')
    expect(html).not.toContain('h-10 px-4 py-4 flex flex-row')
    expect(html).not.toContain('Conteúdo Drawer')
  })

  it('2. MobileSidebar renderiza o drawer com overlay quando open=true', () => {
    const html = renderToString(
      <SidebarProvider open={true}>
        <MobileSidebar>
          <div data-testid="drawer-items">Itens do Menu Mobile</div>
        </MobileSidebar>
      </SidebarProvider>,
    )

    expect(html).toContain('fixed inset-y-0 left-0')
    expect(html).toContain('Itens do Menu Mobile')
    expect(html).toContain('bg-black/50') // backdrop
  })

  it('3. DesktopSidebar possui classe hidden md:flex garantindo que não colapse telas pequenas', () => {
    const html = renderToString(
      <SidebarProvider open={false}>
        <DesktopSidebar>
          <div>Menu Desktop</div>
        </DesktopSidebar>
      </SidebarProvider>,
    )

    expect(html).toContain('hidden md:flex')
    expect(html).toContain('Menu Desktop')
  })

  it('4. AppHeader renderiza botão de hambúrguer em telas mobile/tablet quando onToggleSidebar é fornecido e badge 2025 - 2028', () => {
    const onToggle = vi.fn()
    const html = renderToString(<AppHeader onToggleSidebar={onToggle} />)

    expect(html).toContain('md:hidden')
    expect(html).toContain('Abrir menu')
    expect(html).toContain('Pesquisar...')
    expect(html).toContain('2025 - 2028')
  })

  it('5. SidebarTrigger renderiza botão de alternância funcional', () => {
    const html = renderToString(
      <SidebarProvider open={false}>
        <SidebarTrigger />
      </SidebarProvider>,
    )

    expect(html).toContain('md:hidden')
    expect(html).toContain('Alternar menu lateral')
  })

  it('6. AppSidebar renderiza rotas e links no contexto de navegação', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/producao-tecnica']}>
        <AppSidebar open={true} />
      </MemoryRouter>,
    )

    expect(html).toContain('Produção Técnica')
    expect(html).toContain('/producao-tecnica')
    expect(html).toContain('Docentes')
    expect(html).toContain('Gestão PPG-DCEM')
  })
})
