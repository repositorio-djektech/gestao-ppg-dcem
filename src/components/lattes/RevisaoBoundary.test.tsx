import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { RevisaoBoundary, RevisaoErrorBoundary } from './RevisaoBoundary'

// Componente utilitário que falha intencionalmente na renderização
function ComponenteQueQuebra({
  deveQuebrar,
  mensagem,
}: {
  deveQuebrar: boolean
  mensagem?: string
}) {
  if (deveQuebrar) {
    throw new Error(mensagem || 'Falha proposital de renderização')
  }
  return React.createElement('div', { id: 'sucesso' }, 'Conteúdo renderizado com sucesso')
}

describe('RevisaoBoundary (Error Boundary da tela de revisão Lattes)', () => {
  it('1. exporta RevisaoBoundary e mantém compatibilidade com RevisaoErrorBoundary', () => {
    expect(RevisaoBoundary).toBeDefined()
    expect(RevisaoErrorBoundary).toBe(RevisaoBoundary)
  })

  it('2. instanciação padrão mantém estado hasError false', () => {
    const boundary = new RevisaoBoundary({ children: null })
    expect(boundary.state.hasError).toBe(false)
    expect(boundary.state.error).toBeUndefined()
  })

  it('3. getDerivedStateFromError captura o erro e atualiza o estado hasError', () => {
    const erroTeste = new Error('Erro ao ler .includes() de elemento nulo')
    const proximoEstado = RevisaoBoundary.getDerivedStateFromError(erroTeste)

    expect(proximoEstado.hasError).toBe(true)
    expect(proximoEstado.error).toBe(erroTeste)
  })

  it('4. renderiza children normalmente quando hasError é false', () => {
    const html = renderToString(
      React.createElement(
        RevisaoBoundary,
        { nomeSecao: 'Docentes' },
        React.createElement(ComponenteQueQuebra, { deveQuebrar: false }),
      ),
    )

    expect(html).toContain('Conteúdo renderizado com sucesso')
    expect(html).not.toContain('Erro ao exibir')
  })

  it('5. renderiza tela de fallback completa quando hasError é true', () => {
    const boundary = new RevisaoBoundary({
      nomeSecao: 'Publicações',
      children: null,
    })

    const erroSimulado = new Error('TypeError: Cannot read properties of undefined')
    boundary.state = {
      hasError: true,
      error: erroSimulado,
    }

    // Renderiza a visualização do fallback diretamente pelo boundary
    const vnode = boundary.render() as React.ReactElement
    const html = renderToString(vnode)

    // Título customizado ou padrão
    expect(html).toContain('Erro ao exibir a seção &quot;Publicações&quot;')
    // Mensagem amigável exigida
    expect(html).toContain(
      'Não foi possível renderizar os dados desta aba. Os demais dados continuam disponíveis.',
    )
    // Botão de tentar novamente
    expect(html).toContain('Tentar novamente')
    // Detalhes técnicos para diagnóstico
    expect(html).toContain('Detalhes técnicos do erro (para diagnóstico)')
    expect(html).toContain('TypeError: Cannot read properties of undefined')
  })

  it('6. fallback padrão usa título genérico quando nomeSecao não é informado', () => {
    const boundary = new RevisaoBoundary({
      children: null,
    })

    boundary.state = {
      hasError: true,
      error: new Error('Erro de schema'),
    }

    const vnode = boundary.render() as React.ReactElement
    const html = renderToString(vnode)

    expect(html).toContain('Erro ao exibir esta seção')
    expect(html).toContain('Erro de schema')
  })

  it('7. handleReset restaura estado e dispara callback onVoltar quando fornecido', () => {
    const onVoltarMock = vi.fn()
    const boundary = new RevisaoBoundary({
      children: null,
      onVoltar: onVoltarMock,
    })

    boundary.state = {
      hasError: true,
      error: new Error('Falha temporária'),
    }

    // Simula setState interno do componente
    let estadoAtualizado: any = null
    boundary.setState = vi.fn((newState) => {
      estadoAtualizado = newState
    })

    boundary.handleReset()

    expect(estadoAtualizado).toEqual({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })
    expect(onVoltarMock).toHaveBeenCalledTimes(1)
  })

  it('8. componentDidCatch chama callback onError e registra log de erro', () => {
    const onErrorMock = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const boundary = new RevisaoBoundary({
      children: null,
      onError: onErrorMock,
    })

    const erro = new Error('Falha no parser interno')
    const errorInfo = { componentStack: '\n    in TabelaPublicacoes\n    in TabsContent' }

    boundary.componentDidCatch(erro, errorInfo as any)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erro capturado pelo RevisaoBoundary:',
      erro,
      errorInfo,
    )
    expect(onErrorMock).toHaveBeenCalledWith(erro, errorInfo)

    consoleErrorSpy.mockRestore()
  })
})
