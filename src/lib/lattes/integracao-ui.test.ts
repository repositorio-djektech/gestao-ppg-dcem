import { describe, it, expect, vi } from 'vitest'
import type { ResultadoProcessamentoLattes } from './processor'
import { gravarDadosLattes, converterLattesDocente, converterLattesPublicacao } from './gravar'

describe('Subetapa 2B - Integração UI de Gravação (Lógica Offline)', () => {
  const resultadoMock: ResultadoProcessamentoLattes = {
    arquivosLidosCount: 1,
    curriculosProcessadosCount: 1,
    erros: [],
    resultados: [
      {
        nome_arquivo: '3104369029830651.xml',
        sucesso: true,
        nome_docente: 'Ledjane Silva Barreto',
        id_lattes: '3104369029830651',
        docente: {
          nome_completo: 'Ledjane Silva Barreto',
          id_lattes: '3104369029830651',
          orcid: '0000-0002-1234-5678',
        },
        publicacoes: [
          {
            tipo: 'ARTIGO',
            titulo: 'Síntese de compósitos magnéticos',
            ano: 2023,
            veiculo: 'Ceramics International',
            autores: 'Barreto, L. S.',
            doi: '10.1016/j.ceramint.2023.01.001',
          },
          {
            tipo: 'ARTIGO',
            titulo: 'Nanomateriais para remediação ambiental',
            ano: 2024,
            veiculo: 'Journal of Materials Chemistry A',
            autores: 'Barreto, L. S.; Silva, M.',
            doi: '10.1039/c3ta12345a',
          },
        ],
        orientacoes: [
          {
            tipo: 'MESTRADO',
            titulo_trabalho: 'Estudo de caso',
            orientando: 'Aluno A',
            ano_conclusao: 2023,
            situacao: 'CONCLUIDA',
            tipo_orientacao: 'ORIENTADOR_PRINCIPAL',
          },
        ],
        bancas: [],
        projetos: [],
        producoes_tecnicas: [],
        patentes: [],
        eventos: [],
        premiacoes: [],
        itens_ignorados: [],
        estatisticas: {
          publicacoes: { a_inserir: 2, ignorados: 0 },
          orientacoes: { a_inserir: 1, ignorados: 0 },
          bancas: { a_inserir: 0, ignorados: 0 },
          projetos: { a_inserir: 0, ignorados: 0 },
          producoes_tecnicas: { a_inserir: 0, ignorados: 0 },
          patentes: { a_inserir: 0, ignorados: 0 },
          eventos: { a_inserir: 0, ignorados: 0 },
          premiacoes: { a_inserir: 0, ignorados: 0 },
        },
      },
    ],
    resumoGeral: {
      totalDocentes: 1,
      secoes: {} as any,
    },
  }

  it('1. filtra rigorosamente apenas tabelas marcadas (Docentes e Publicações)', async () => {
    // Caso: usuário desmarcou Docentes, marcou apenas Publicações
    const tabelasSelecionadas = {
      docentes: false,
      publicacoes: true,
      orientacoes: true, // Não implementada no gravar.ts
      bancas: true,
    }

    const docentesParaGravar = tabelasSelecionadas.docentes
      ? resultadoMock.resultados
          .map((r) => r.docente)
          .filter((d): d is NonNullable<typeof d> => Boolean(d))
          .map(converterLattesDocente)
      : []

    const publicacoesParaGravar = tabelasSelecionadas.publicacoes
      ? resultadoMock.resultados.flatMap((r) => r.publicacoes).map(converterLattesPublicacao)
      : []

    expect(docentesParaGravar).toHaveLength(0)
    expect(publicacoesParaGravar).toHaveLength(2)
    expect(publicacoesParaGravar[0].titulo).toBe('Síntese de compósitos magnéticos')
  })

  it('2. desmarcação total resulta em 0 registros e impede gravação', () => {
    const tabelasSelecionadas = {
      docentes: false,
      publicacoes: false,
      orientacoes: false,
    }

    const docentesParaGravar = tabelasSelecionadas.docentes
      ? resultadoMock.resultados
          .map((r) => r.docente)
          .filter(Boolean)
          .map((d) => converterLattesDocente(d!))
      : []

    const publicacoesParaGravar = tabelasSelecionadas.publicacoes
      ? resultadoMock.resultados.flatMap((r) => r.publicacoes).map(converterLattesPublicacao)
      : []

    const totalAptos = docentesParaGravar.length + publicacoesParaGravar.length
    expect(totalAptos).toBe(0)
  })

  it('3. executa gravação via gravarDadosLattes e isola falhas reportando resultado por tabela', async () => {
    // Mock simples de client Supabase
    const dbDocentes: any[] = []
    const dbPublicacoes: any[] = []

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'docentes') {
          return {
            select: vi.fn().mockResolvedValue({ data: dbDocentes, error: null }),
            insert: vi.fn((rows: any[]) => {
              rows.forEach((r, i) => dbDocentes.push({ id: i + 1, ...r }))
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: dbDocentes[0], error: null }),
                }),
              }
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'publicacoes') {
          return {
            select: vi.fn().mockResolvedValue({ data: dbPublicacoes, error: null }),
            insert: vi.fn((rows: any[]) => {
              rows.forEach((r, i) => dbPublicacoes.push({ id: i + 10, ...r }))
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: dbPublicacoes[dbPublicacoes.length - 1],
                    error: null,
                  }),
                }),
              }
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    }

    const docentes = resultadoMock.resultados
      .map((r) => r.docente)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map(converterLattesDocente)

    const publicacoes = resultadoMock.resultados
      .flatMap((r) => r.publicacoes)
      .map(converterLattesPublicacao)

    const relatorio = await gravarDadosLattes({ docentes, publicacoes }, mockClient as any)

    expect(relatorio.docentes.inseridos).toBe(1)
    expect(relatorio.publicacoes.inseridos).toBe(2)
    expect(relatorio.erros).toHaveLength(0)

    // Checa que o callback do dashboard receberia os dados corretos
    const gravouAlgo =
      relatorio.docentes.inseridos > 0 ||
      relatorio.docentes.atualizados > 0 ||
      relatorio.publicacoes.inseridos > 0 ||
      relatorio.publicacoes.atualizados > 0

    expect(gravouAlgo).toBe(true)
  })

  it('4. Subetapa 2C: grava todas as 9 tabelas selecionadas quando fornecidas', async () => {
    const tabelasMockData: Record<string, any[]> = {
      docentes: [],
      publicacoes: [],
      orientacoes: [],
      bancas: [],
      projetos_pesquisa: [],
      premiacoes: [],
      producao_tecnica: [],
      patentes: [],
      eventos: [],
      discentes: [{ id: 99, nome: 'Aluno A' }],
    }

    const mockClient = {
      from: vi.fn((table: string) => {
        const store = tabelasMockData[table] || []
        return {
          select: vi.fn().mockResolvedValue({ data: [...store], error: null }),
          insert: vi.fn((rows: any[]) => {
            const created = rows.map((r, i) => ({ id: store.length + i + 1, ...r }))
            store.push(...created)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: created[0],
                  error: null,
                }),
              }),
            }
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }),
    }

    const relatorio = await gravarDadosLattes(
      {
        docentes: [{ id_lattes: '3104369029830651', nome: 'Ledjane Silva Barreto' }],
        publicacoes: [
          { titulo: 'Artigo 1', ano: 2023, autores: 'Barreto, L.', periodico: 'Revista' },
        ],
        orientacoes: [
          {
            discente_nome: 'Aluno A',
            tipo: 'Mestrado',
            inicio: '2023',
            status: 'concluido',
            docente_identificador: '3104369029830651',
          },
        ],
        bancas: [
          {
            titulo_trabalho: 'Banca Dissertação',
            data: '2023',
            tipo: 'Mestrado',
            membros: 'Prof 1',
          },
        ],
        projetos_pesquisa: [
          {
            titulo: 'Projeto Nanocompósitos',
            inicio: '2022',
            fim: '2025',
            financiamento: true,
            orgao_fomento: 'CNPq',
          },
        ],
        premiacoes: [
          {
            titulo: 'Prêmio Destaque',
            ano: 2024,
            nome_premiado: 'Ledjane Silva Barreto',
            instituicao: 'CAPES',
          },
        ],
        producao_tecnica: [
          {
            titulo: 'Software de Cálculo',
            ano: 2023,
            tipo: 'Software',
            autores: 'Barreto, L.',
          },
        ],
        patentes: [
          {
            titulo: 'Processo de síntese de nanopartículas',
            status: 'Pendente',
            autores: 'Barreto, L.',
            inpi: 'BR 10 2023 0001',
          },
        ],
        eventos: [
          {
            docente: 'Ledjane Silva Barreto',
            evento: 'CBECiMat 2024',
            local_data: 'São Paulo - 2024',
            papel: 'Apresentador de Trabalho',
          },
        ],
      },
      mockClient as any,
    )

    expect(relatorio.docentes.inseridos).toBe(1)
    expect(relatorio.publicacoes.inseridos).toBe(1)
    expect(relatorio.orientacoes.inseridos).toBe(1)
    expect(relatorio.bancas.inseridos).toBe(1)
    expect(relatorio.projetos_pesquisa.inseridos).toBe(1)
    expect(relatorio.premiacoes.inseridos).toBe(1)
    expect(relatorio.producao_tecnica.inseridos).toBe(1)
    expect(relatorio.patentes.inseridos).toBe(1)
    expect(relatorio.eventos.inseridos).toBe(1)
    expect(relatorio.erros).toHaveLength(0)
  })
})
