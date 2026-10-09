import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SidebarProvider, useSidebar } from './sidebar'
import { AppSidebar } from '../AppSidebar'

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
    const html = renderToString(<AppSidebar />)

    // O texto 'Gestão PPG-DCEM' só é renderizado quando open=true no Logo
    expect(html).toContain('Gestão PPG-DCEM')
    // No estado aberto, as seções têm títulos (Geral, Pessoas, Acadêmico, Produção, Difusão/Outros)
    expect(html).toContain('Geral')
    expect(html).toContain('Pessoas')
    expect(html).toContain('Acadêmico')
    expect(html).toContain('Produção')
    expect(html).toContain('Difusão/Outros')
  })
})
