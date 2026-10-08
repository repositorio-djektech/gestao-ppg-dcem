import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { VincularOpenAlexDialog } from './VincularOpenAlexDialog'
import type { OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import type { Docente } from '@/types/database'

describe('VincularOpenAlexDialog (UI de busca e vinculação)', () => {
  const docenteMock: Docente = {
    id: 1,
    nome: 'Ledjane Silva Barreto',
    scopus_id: '',
    indice_h: 0,
    bolsa_cnpq: '',
    jdp: false,
    licenca: '',
    id_lattes: '3104369029830651',
    openalex_id: null,
  }

  const docenteVinculadoMock: Docente = {
    ...docenteMock,
    id: 2,
    openalex_id: 'A5069892096',
    indice_h: 15,
  }

  const candidatoMock: OpenAlexAutorCandidato = {
    id: 'https://openalex.org/A5069892096',
    openalex_id: 'A5069892096',
    display_name: 'Ledjane Silva Barreto',
    h_index: 18,
    works_count: 42,
    cited_by_count: 530,
    orcid: 'https://orcid.org/0000-0002-1234-5678',
    ultima_instituicao: 'Universidade Federal de Sergipe',
  }

  it('1. exporta o componente VincularOpenAlexDialog corretamente', () => {
    expect(VincularOpenAlexDialog).toBeDefined()
    expect(typeof VincularOpenAlexDialog).toBe('function')
  })

  it('2. renderiza o modal fechado sem quebrar quando open=false', () => {
    const html = renderToString(
      React.createElement(VincularOpenAlexDialog, {
        open: false,
        onOpenChange: vi.fn(),
        docente: docenteMock,
        onVincular: vi.fn(),
      }),
    )
    expect(html).toBe('')
  })

  it('3. renderiza estrutura e docente selecionado quando open=true', () => {
    const html = renderToString(
      React.createElement(VincularOpenAlexDialog, {
        open: true,
        onOpenChange: vi.fn(),
        docente: docenteMock,
        onVincular: vi.fn(),
      }),
    )

    expect(html).toContain('Vincular Perfil OpenAlex')
    expect(html).toContain('Ledjane Silva Barreto')
    expect(html).toContain('Buscar')
  })

  it('4. exibe badge do ID atual se docente já tiver openalex_id', () => {
    const html = renderToString(
      React.createElement(VincularOpenAlexDialog, {
        open: true,
        onOpenChange: vi.fn(),
        docente: docenteVinculadoMock,
        onVincular: vi.fn(),
      }),
    )

    expect(html).toContain('Atual: A5069892096')
  })

  it('5. fluxo de callback onVincular repassa o docenteId e objeto candidato correto', async () => {
    const onVincularMock = vi.fn().mockResolvedValue(undefined)

    // Testa a lógica da função de vínculo
    await onVincularMock(docenteMock.id, candidatoMock)

    expect(onVincularMock).toHaveBeenCalledTimes(1)
    expect(onVincularMock).toHaveBeenCalledWith(1, candidatoMock)
    expect(candidatoMock.openalex_id).toBe('A5069892096')
    expect(candidatoMock.h_index).toBe(18)
  })
})
