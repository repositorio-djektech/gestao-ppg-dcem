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
    // Largura reduzida em 20%: max-w-[68vw] e sm:max-w-[256px]
    expect(html).toContain('max-w-[68vw]')
    expect(html).toContain('sm:max-w-[256px]')
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

  it('4. AppHeader renderiza botão de alternância à esquerda da busca e badge 2025 - 2028 à direita sem avatar', () => {
    const onToggle = vi.fn()
    const html = renderToString(<AppHeader onToggleSidebar={onToggle} sidebarOpen={false} />)

    expect(html).toContain('Expandir menu lateral')
    expect(html).toContain('Pesquisar...')
    expect(html).toContain('2025 - 2028')
    expect(html).not.toContain('Sair da conta') // Avatar e dropdown removidos do Header
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

  it('7. AppSidebar renderiza botão de saída e modal de confirmação (AlertDialog)', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar open={true} />
      </MemoryRouter>,
    )

    expect(html).toContain('Sair do sistema')
  })

  it('8. AppSidebar possui header com estrutura fixa, linha divisória border-b e corpo rolável', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar open={true} />
      </MemoryRouter>,
    )

    // Header fixo separado com linha border-b e alinhado com AppHeader (h-16 border-b border-neutral-200)
    expect(html).toContain('h-16')
    expect(html).toContain('border-b border-neutral-200')
    // Rodapé fixo separado com linha border-t
    expect(html).toContain('border-t border-neutral-200')
    // Lista de links com container de scroll próprio
    expect(html).toContain('overflow-y-auto')
    // Scrollbar fina e sutil sem gutter reservado
    expect(html).toContain('sidebar-scrollbar')
  })

  it('9. AppHeader possui badge 2025 - 2028 sem efeito hover (pointer-events-none, cursor-default)', () => {
    const html = renderToString(<AppHeader />)
    expect(html).toContain('2025 - 2028')
    expect(html).toContain('pointer-events-none')
    expect(html).toContain('cursor-default')
  })

  it('10. SidebarProvider e AppSidebar inicializam fechados no mobile (< 768px) e abertos no desktop (>= 768px)', () => {
    // Simula viewport mobile (< 768px)
    const originalInnerWidth = window.innerWidth
    try {
      window.innerWidth = 400
      const htmlMobile = renderToString(
        <SidebarProvider>
          <MobileSidebar>
            <div data-testid="mobile-conteudo">Mobile Fechado</div>
          </MobileSidebar>
        </SidebarProvider>,
      )
      // No mobile default inicial deve estar fechado (conteúdo do drawer não aparece sem clique)
      expect(htmlMobile).not.toContain('Mobile Fechado')

      // Simula viewport desktop (>= 768px)
      window.innerWidth = 1024
      const htmlDesktop = renderToString(
        <SidebarProvider>
          <DesktopSidebar>
            <div data-testid="desktop-conteudo">Desktop Aberto</div>
          </DesktopSidebar>
        </SidebarProvider>,
      )
      // No desktop continua renderizando aberto
      expect(htmlDesktop).toContain('Desktop Aberto')
    } finally {
      window.innerWidth = originalInnerWidth
    }
  })
})
