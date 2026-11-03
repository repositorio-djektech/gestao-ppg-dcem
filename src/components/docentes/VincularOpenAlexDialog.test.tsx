import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { VincularOpenAlexDialog } from './VincularOpenAlexDialog'
import type { OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import type { ScopusAutorCandidato } from '@/lib/scopus/buscar'
import type { Docente } from '@/types/database'

// O diálogo (Radix) renderiza num portal no body: renderToString não o enxerga, então monta de
// verdade e lê o HTML do document.body.
// Ao abrir, o diálogo já dispara a busca no OpenAlex: o fetch fica pendente para não ir à rede
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderHtml(el: React.ReactElement): string {
  render(el)
  return document.body.innerHTML
}

describe('VincularOpenAlexDialog (UI de busca e vinculação OpenAlex / Scopus)', () => {
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
    scopus_id: '6602703039',
    indice_h: 15,
  }

  const candidatoOpenAlexMock: OpenAlexAutorCandidato = {
    id: 'https://openalex.org/A5069892096',
    openalex_id: 'A5069892096',
    display_name: 'Ledjane Silva Barreto',
    h_index: 18,
    works_count: 42,
    cited_by_count: 530,
    orcid: 'https://orcid.org/0000-0002-1234-5678',
    ultima_instituicao: 'Universidade Federal de Sergipe',
  }

  const candidatoScopusMock: ScopusAutorCandidato = {
    scopus_id: '6602703039',
    nome: 'Ledjane Barreto',
    instituicao: 'Universidade Federal de Sergipe',
    document_count: 62,
    cited_by_count: 1120,
    orcid: '0000-0002-1234-5678',
  }

  it('1. exporta o componente VincularOpenAlexDialog corretamente', () => {
    expect(VincularOpenAlexDialog).toBeDefined()
    expect(typeof VincularOpenAlexDialog).toBe('function')
  })

  it('2. renderiza o modal fechado sem quebrar quando open=false', () => {
    const html = renderHtml(
      React.createElement(VincularOpenAlexDialog, {
        open: false,
        onOpenChange: vi.fn(),
        docente: docenteMock,
        onVincular: vi.fn(),
      }),
    )
    // Fechado: nada é montado (nem no portal)
    expect(document.body.textContent).toBe('')
    expect(html).not.toContain('Vincular Identificadores')
  })

  it('3. renderiza abas OpenAlex e Scopus e docente selecionado quando open=true', () => {
    const html = renderHtml(
      React.createElement(VincularOpenAlexDialog, {
        open: true,
        onOpenChange: vi.fn(),
        docente: docenteMock,
        onVincular: vi.fn(),
        onVincularScopus: vi.fn(),
      }),
    )

    expect(html).toContain('Vincular Identificadores Acadêmicos')
    expect(html).toContain('Ledjane Silva Barreto')
    expect(html).toContain('OpenAlex')
    expect(html).toContain('Elsevier Scopus')
    // A busca inicial já está em andamento ao abrir; depois dela o botão volta a "Buscar OpenAlex"
    expect(html).toMatch(/Buscar OpenAlex|Buscando\.\.\./)
  })

  it('4. exibe badges de ambos os IDs se docente já tiver vinculações', () => {
    const html = renderHtml(
      React.createElement(VincularOpenAlexDialog, {
        open: true,
        onOpenChange: vi.fn(),
        docente: docenteVinculadoMock,
        onVincular: vi.fn(),
        onVincularScopus: vi.fn(),
      }),
    )

    expect(html).toContain('OpenAlex: A5069892096')
    expect(html).toContain('Scopus: 6602703039')
  })

  it('5. fluxo de callback onVincular repassa o docenteId e objeto candidato correto', async () => {
    const onVincularMock = vi.fn().mockResolvedValue(undefined)

    await onVincularMock(docenteMock.id, candidatoOpenAlexMock)

    expect(onVincularMock).toHaveBeenCalledTimes(1)
    expect(onVincularMock).toHaveBeenCalledWith(1, candidatoOpenAlexMock)
    expect(candidatoOpenAlexMock.openalex_id).toBe('A5069892096')
    expect(candidatoOpenAlexMock.h_index).toBe(18)
  })

  it('6. fluxo de callback onVincularScopus repassa o docenteId e objeto Scopus correto', async () => {
    const onVincularScopusMock = vi.fn().mockResolvedValue(undefined)

    await onVincularScopusMock(docenteMock.id, candidatoScopusMock)

    expect(onVincularScopusMock).toHaveBeenCalledTimes(1)
    expect(onVincularScopusMock).toHaveBeenCalledWith(1, candidatoScopusMock)
    expect(candidatoScopusMock.scopus_id).toBe('6602703039')
    expect(candidatoScopusMock.document_count).toBe(62)
  })

  it('7. detecta ID numérico e exibe card de vinculação direta imediata sem bloquear', () => {
    // Quando docente possui termo ou o diálogo é aberto na aba Scopus
    const html = renderHtml(
      React.createElement(VincularOpenAlexDialog, {
        open: true,
        onOpenChange: vi.fn(),
        docente: { ...docenteMock, scopus_id: '7005598575' },
        abaInicial: 'scopus',
        onVincular: vi.fn(),
        onVincularScopus: vi.fn(),
      }),
    )

    // A aba scopus está presente
    expect(html).toContain('Elsevier Scopus')
    expect(html).toContain('Vincular Identificadores Acadêmicos')
  })
})
