import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { VisualizarDocenteDialog } from './VisualizarDocenteDialog'
import type { Docente } from '@/types/database'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
        order: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}))

describe('VisualizarDocenteDialog', () => {
  const docenteMock: Docente = {
    id: 1,
    nome: 'Prof. Dra. Maria Silva',
    id_lattes: '1234567890123456',
    scopus_id: '123456789',
    openalex_id: 'A123456789',
    indice_h: 15,
    bolsa_cnpq: 'PQ-2',
    jdp: false,
    licenca: '',
  }

  it('renderiza o botão Imprimir ao lado do botão Fechar no rodapé', () => {
    const html = renderToString(
      <VisualizarDocenteDialog open={true} onOpenChange={vi.fn()} docente={docenteMock} />,
    )

    expect(html).toContain('Fechar')
    expect(html).toContain('Imprimir')
    expect(html).toContain('Maria Silva')
  })

  it('renderiza o modal com fundo claro na área entre o header e o rodapé', () => {
    const html = renderToString(
      <VisualizarDocenteDialog open={true} onOpenChange={vi.fn()} docente={docenteMock} />,
    )

    // A área de conteúdo intermediário possui fundo claro bg-white dark:bg-neutral-900
    expect(html).toContain('bg-white dark:bg-neutral-900')
    // Cards de identificação e resumo no banco preservam seus fundos (bg-slate-50 dark:bg-neutral-800/60)
    expect(html).toContain('Identificação e Índices Bibliométricos')
    expect(html).toContain('Resumo dos Registros Associados no Banco')
  })

  it('renderiza os elementos de seleção de abas para impressão no documento', () => {
    const html = renderToString(
      <VisualizarDocenteDialog open={true} onOpenChange={vi.fn()} docente={docenteMock} />,
    )

    expect(html).toContain('Selecionar todas as abas')
    expect(html).toContain('Gerar Impressão')
    expect(html).toContain('Relatório Curricular Individual')
  })
})
