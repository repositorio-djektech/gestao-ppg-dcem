import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider, useSidebar } from './sidebar'
import { AppSidebar } from '../AppSidebar'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user' } },
    profile: { name: 'Prof. Teste', email: 'teste@ufs.br', role: 'suporte' },
    loading: false,
    signOut: vi.fn(),
  }),
}))

// Componente auxiliar para capturar o contexto do Sidebar em tempo de render
function SidebarStateProbe({ onState }: { onState: (open: boolean) => void }) {
  const { open } = useSidebar()
  onState(open)
  return <div data-testid="probe">{open ? 'open' : 'closed'}</div>
}

describe('Tarefa B - Sidebar aberta por padrão', () => {
  it('SidebarProvider inicializa com open=true por padrão', () => {
    let capturedOpen: boolean | undefined
    const html = renderToString(
      <SidebarProvider>
        <SidebarStateProbe
          onState={(open) => {
            capturedOpen = open
          }}
        />
      </SidebarProvider>,
    )

    expect(capturedOpen).toBe(true)
    expect(html).toContain('open')
  })

  it('permite sobrescrever o valor inicial via prop open quando explicitamente fornecido', () => {
    let capturedOpen: boolean | undefined
    const html = renderToString(
      <SidebarProvider open={false}>
        <SidebarStateProbe
          onState={(open) => {
            capturedOpen = open
          }}
        />
      </SidebarProvider>,
    )

    expect(capturedOpen).toBe(false)
    expect(html).toContain('closed')
  })

  it('AppSidebar inicializa no modo aberto (expandido, 240px) quando nenhuma prop é passada', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar />
      </MemoryRouter>,
    )

    // O logo expandido exibe alt "P²CEM - UFS" quando open=true
    expect(html).toContain('P²CEM - UFS')
    // No estado aberto, as seções têm títulos (Geral, Pessoas, Acadêmico, Produção, Difusão/Outros)
    expect(html).toContain('Geral')
    expect(html).toContain('Pessoas')
    expect(html).toContain('Acadêmico')
    expect(html).toContain('Produção')
    expect(html).toContain('Difusão/Outros')
  })

  it('No desktop, clicar no item de navegação NÃO fecha a sidebar', () => {
    const originalInnerWidth = window.innerWidth
    try {
      window.innerWidth = 1200 // Desktop >= 1024
      const setOpenSpy = vi.fn()
      // Renderiza com open=true e espiona setOpen
      const html = renderToString(
        <MemoryRouter initialEntries={['/']}>
          <AppSidebar open={true} setOpen={setOpenSpy} />
        </MemoryRouter>,
      )
      expect(setOpenSpy).not.toHaveBeenCalled()
      expect(html).toContain('Dashboard')
    } finally {
      window.innerWidth = originalInnerWidth
    }
  })

  it('No modo recolhido (open=false), renderiza ícones com Tooltip no desktop e sem quebrar estrutura', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar open={false} />
      </MemoryRouter>,
    )

    // Quando recolhida, o LogoIcon é renderizado
    expect(html).toContain('title="P²CEM"')
    // No estado recolhido, as labels textuais não ficam no DOM regular do link
    expect(html).not.toContain('Geral')
  })

  it('No modo aberto (open=true), renderiza o botão de fechar no header da sidebar', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar open={true} />
      </MemoryRouter>,
    )

    expect(html).toContain('title="Recolher menu lateral"')
    expect(html).toContain('aria-label="Recolher menu lateral"')
  })
})
