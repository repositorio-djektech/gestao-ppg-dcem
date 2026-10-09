import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { VisualizarDocenteDialog } from './VisualizarDocenteDialog'
import { ModalSelecaoAbasImpressao } from './ModalSelecaoAbasImpressao'
import { DocentePrintDocument } from './DocentePrintDocument'
import { gerarHtmlDocenteRelatorio } from '@/lib/docentes/imprimirDocenteIframe'
import type { Docente } from '@/types/database'
import type { DadosDocenteCompleto, TabKey } from './DocentePrintDocument'
import { User, FileText, Users2 } from 'lucide-react'

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

  const dadosCompletosMock: DadosDocenteCompleto = {
    docente: docenteMock,
    publicacoes: [
      {
        id: 101,
        titulo: 'Artigo sobre Nanomateriais de Carbono',
        ano: 2025,
        periodico: 'Journal of Materials Science',
        autores: 'Silva, M.; Barreto, L. S.',
        doi: '10.1000/182',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      },
    ],
    orientacoes: [
      {
        id: 201,
        docente_id: 1,
        discente_id: 301,
        discente_nome: 'João Pedro Santos',
        tipo: 'Doutorado',
        inicio: '2024',
        fim: '2028',
        status: 'ativo',
        link_comprovacao: '',
        observacoes: 'Bolsista FAPITEC',
      },
    ],
    bancas: [],
    projetos: [
      {
        id: 401,
        titulo: 'Desenvolvimento de Biocompósitos Avançados',
        coordenador_id: 1,
        inicio: '2023',
        fim: '2026',
        financiamento: true,
        orgao_fomento: 'CNPq',
        descricao: 'Pesquisa aplicada em engenharia de materiais',
        link_comprovacao: '',
        observacoes: '',
      },
    ],
    premiacoes: [],
    producaoTecnica: [],
    patentes: [],
    eventos: [],
    mobilidade: [],
    impactoSocial: [],
  }

  const todasAbasAtivas: Record<TabKey, boolean> = {
    geral: true,
    publicacoes: true,
    orientacoes: true,
    bancas: true,
    projetos: true,
    premiacoes: true,
    producao_tecnica: true,
    patentes: true,
    eventos: true,
    mobilidade: true,
    impacto_social: true,
  }

  it('renderiza o botão Imprimir ao lado do botão Fechar no rodapé do diálogo do docente', () => {
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

    expect(html).toContain('bg-white dark:bg-neutral-900')
    expect(html).toContain('Identificação e Índices Bibliométricos')
    expect(html).toContain('Resumo dos Registros Associados no Banco')
  })

  it('renderiza o Modal de Seleção de Abas montado no nível da página', () => {
    const abasDef = [
      { id: 'geral' as TabKey, rotulo: 'Dados Cadastrais', icone: User, total: 1 },
      { id: 'publicacoes' as TabKey, rotulo: 'Publicações', icone: FileText, total: 1 },
      { id: 'orientacoes' as TabKey, rotulo: 'Orientações', icone: Users2, total: 1 },
    ]

    const html = renderToString(
      <ModalSelecaoAbasImpressao
        open={true}
        onOpenChange={vi.fn()}
        abasDefinicao={abasDef}
        abasSelecionadas={todasAbasAtivas}
        onAlternarTodas={vi.fn()}
        onAlternarAba={vi.fn()}
        onConfirmarImpressao={vi.fn()}
      />,
    )

    expect(html).toContain('Imprimir Dados do Docente')
    expect(html).toContain('Selecionar todas as abas')
    expect(html).toContain('Cancelar')
    expect(html).toContain('Gerar Impressão')
    expect(html).toContain('Dados Cadastrais')
    expect(html).toContain('Publicações')
    expect(html).toContain('Orientações')
  })

  it('renderiza o DocentePrintDocument estruturado com cabeçalho institucional, seções por aba e tabelas ABNT', () => {
    const html = renderToString(
      <DocentePrintDocument
        docente={docenteMock}
        dados={dadosCompletosMock}
        abasSelecionadas={todasAbasAtivas}
      />,
    )

    // Cabeçalho Institucional ABNT
    expect(html).toContain(
      'Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM',
    )
    expect(html).toContain('Relatório Curricular Individual — Prof. Dra. Maria Silva')
    expect(html).toContain('Data de emissão:')

    // Classes de quebra de página e seções estruturadas
    expect(html).toContain('docente-print-document')
    expect(html).toContain('print-header')
    expect(html).toContain('print-section')
    expect(html).toContain('print-table')
    expect(html).toContain('print-footer')

    // Conteúdo das seções selecionadas
    expect(html).toContain('1. Identificação e Índices Bibliométricos')
    expect(html).toContain('Publicações em Periódicos (1)')
    expect(html).toContain('Artigo sobre Nanomateriais de Carbono')
    expect(html).toContain('Orientações e Supervisões (1)')
    expect(html).toContain('João Pedro Santos')
    expect(html).toContain('Projetos de Pesquisa (1)')
    expect(html).toContain('Desenvolvimento de Biocompósitos Avançados')

    // Rodapé institucional
    expect(html).toContain('Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM')
  })

  it('permite filtrar seções no DocentePrintDocument desmarcando abas', () => {
    const apenasPublicacoes: Record<TabKey, boolean> = {
      geral: false,
      publicacoes: true,
      orientacoes: false,
      bancas: false,
      projetos: false,
      premiacoes: false,
      producao_tecnica: false,
      patentes: false,
      eventos: false,
      mobilidade: false,
      impacto_social: false,
    }

    const html = renderToString(
      <DocentePrintDocument
        docente={docenteMock}
        dados={dadosCompletosMock}
        abasSelecionadas={apenasPublicacoes}
      />,
    )

    // Contém publicações
    expect(html).toContain('Publicações em Periódicos (1)')
    expect(html).toContain('Artigo sobre Nanomateriais de Carbono')

    // NÃO contém seções desmarcadas
    expect(html).not.toContain('1. Identificação e Índices Bibliométricos')
    expect(html).not.toContain('Orientações e Supervisões (1)')
    expect(html).not.toContain('Projetos de Pesquisa (1)')
  })

  it('gerarHtmlDocenteRelatorio gera documento HTML independente com @page ABNT, seções apenas para abas marcadas e dados corretos', () => {
    const html = gerarHtmlDocenteRelatorio(docenteMock, dadosCompletosMock, todasAbasAtivas)

    // Estrutura HTML completa e independente
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="pt-BR">')
    expect(html).toContain(
      '<title>Relatório Curricular Individual — Prof. Dra. Maria Silva</title>',
    )

    // Configuração ABNT de @page com margens 2,5cm superior/esquerda e 2cm direita/inferior
    expect(html).toContain('size: A4 portrait;')
    expect(html).toContain('margin-top: 25mm;')
    expect(html).toContain('margin-left: 25mm;')
    expect(html).toContain('margin-right: 20mm;')
    expect(html).toContain('margin-bottom: 20mm;')

    // Quebra de página entre seções
    expect(html).toContain('.print-section + .print-section')
    expect(html).toContain('page-break-before: always;')

    // Cabeçalho ABNT com dados institucionais
    expect(html).toContain(
      'Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM',
    )
    expect(html).toContain('Relatório Curricular Individual — Prof. Dra. Maria Silva')
    expect(html).toContain('3 registro(s) associado(s)')

    // Conteúdo das seções
    expect(html).toContain('1. Identificação e Índices Bibliométricos')
    expect(html).toContain('Publicações em Periódicos (1)')
    expect(html).toContain('Artigo sobre Nanomateriais de Carbono')
    expect(html).toContain('Orientações e Supervisões (1)')
    expect(html).toContain('João Pedro Santos')
    expect(html).toContain('Projetos de Pesquisa (1)')
    expect(html).toContain('Desenvolvimento de Biocompósitos Avançados')
  })

  it('gerarHtmlDocenteRelatorio omite seções desmarcadas', () => {
    const apenasGeral: Record<TabKey, boolean> = {
      geral: true,
      publicacoes: false,
      orientacoes: false,
      bancas: false,
      projetos: false,
      premiacoes: false,
      producao_tecnica: false,
      patentes: false,
      eventos: false,
      mobilidade: false,
      impacto_social: false,
    }

    const html = gerarHtmlDocenteRelatorio(docenteMock, dadosCompletosMock, apenasGeral)

    expect(html).toContain('1. Identificação e Índices Bibliométricos')
    expect(html).not.toContain('Publicações em Periódicos')
    expect(html).not.toContain('Orientações e Supervisões')
    expect(html).not.toContain('Projetos de Pesquisa')
  })

  it('valida geração de relatório da Ledjane com dados reais (5 publicações, 9 orientações, 1 projeto)', () => {
    const docenteLedjane: Docente = {
      id: 4,
      nome: 'Ledjane Silva Barreto',
      id_lattes: '3104369029830651',
      scopus_id: '7005598575',
      openalex_id: 'A5012512598',
      indice_h: 22,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    }

    const dadosLedjane: DadosDocenteCompleto = {
      docente: docenteLedjane,
      publicacoes: [
        {
          id: 1,
          titulo: 'Pub 1',
          ano: 2024,
          periodico: 'Periódico A',
          autores: 'Barreto, L. S.',
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          titulo: 'Pub 2',
          ano: 2024,
          periodico: 'Periódico B',
          autores: 'Barreto, L. S.',
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 3,
          titulo: 'Pub 3',
          ano: 2023,
          periodico: 'Periódico C',
          autores: 'Barreto, L. S.',
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 4,
          titulo: 'Pub 4',
          ano: 2022,
          periodico: 'Periódico D',
          autores: 'Barreto, L. S.',
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 5,
          titulo: 'Pub 5',
          ano: 2021,
          periodico: 'Periódico E',
          autores: 'Barreto, L. S.',
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ],
      orientacoes: Array.from({ length: 9 }).map((_, i) => ({
        id: i + 1,
        docente_id: 4,
        discente_id: 100 + i,
        discente_nome: `Discente Orientado ${i + 1}`,
        tipo: 'Mestrado',
        inicio: '2023',
        fim: '2025',
        status: 'ativo',
        link_comprovacao: '',
        observacoes: '',
      })),
      bancas: [],
      projetos: [
        {
          id: 50,
          titulo: 'Projeto Nanotecnologia e Materiais Funcionais',
          coordenador_id: 4,
          inicio: '2022',
          fim: '2025',
          financiamento: true,
          orgao_fomento: 'FAPITEC',
          descricao: 'Projeto coordenado por Ledjane',
          link_comprovacao: '',
          observacoes: '',
        },
      ],
      premiacoes: [],
      producaoTecnica: [],
      patentes: [],
      eventos: [],
      mobilidade: [],
      impactoSocial: [],
    }

    const html = gerarHtmlDocenteRelatorio(docenteLedjane, dadosLedjane, todasAbasAtivas)

    expect(html).toContain('Relatório Curricular Individual — Ledjane Silva Barreto')
    expect(html).toContain('7005598575') // Scopus ID real
    expect(html).toContain('A5012512598') // OpenAlex ID real
    expect(html).toContain('3104369029830651') // Lattes ID
    expect(html).toContain('Publicações em Periódicos (5)')
    expect(html).toContain('Orientações e Supervisões (9)')
    expect(html).toContain('Projetos de Pesquisa (1)')
    expect(html).toContain('15 registro(s) associado(s)')
  })
})
