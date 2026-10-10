import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Reconducao from './Reconducao'
import type { RelatorioReconducaoResposta } from '@/lib/reconducao/types'

describe('Página Recondução (Etapa D)', () => {
  const dadosMock: RelatorioReconducaoResposta = {
    sucesso: true,
    gerado_em: '2026-10-10T14:30:00.000Z',
    quadrienio: {
      ano_inicio: 2025,
      ano_fim: 2028,
    },
    nota_metodologica: {
      criterio_iv_np_coautoria:
        'O NP estrito considera apenas publicações com fator de impacto JCR >= 1.0 com coautoria confirmada.',
      criterio_ii_disciplinas_temporais: 'Disciplinas ministradas no quadriênio 2025-2028.',
    },
    resumo: {
      ano_inicio: 2025,
      ano_fim: 2028,
      total_docentes: 4,
      total_permanentes: 3,
      total_colaboradores: 1,
      total_sem_categoria: 0,
      reconduzidos: 1,
      nao_atendem: 1,
      pdq_insuficiente: 1,
      nao_aplicavel: 1,
    },
    avaliacoes: [
      {
        docente_id: 1,
        nome: 'Carlos Alberto Reconduzido',
        categoria: 'permanente',
        scopus_id: '1111111111',
        id_lattes: '1111222233334444',
        criterio_i: {
          atendido: true,
          quantidade: 3,
          detalhe: '3 orientações principais no quadriênio',
          itens: [{ tipo: 'Mestrado', inicio: '2025', fim: '2026', status: 'concluido' }],
        },
        criterio_ii: {
          atendido: true,
          quantidade: 2,
          detalhe: '2 disciplinas ministradas no quadriênio',
          itens: [{ nome: 'Ciência dos Materiais', codigo: 'DCEM001', ano_semestre: '2025-1' }],
        },
        criterio_iii: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 projeto com financiamento FAPITEC',
          itens: [{ titulo: 'Nanomateriais Avançados', orgao_fomento: 'FAPITEC' }],
        },
        criterio_iv: {
          atendido: true,
          quantidade: 4,
          detalhe: 'PDQ 1.33 >= 1.0',
        },
        pdq_detalhes: {
          np: 4,
          np_teto: 5,
          np_pendente: 1,
          msc: 2,
          dsc: 1,
          titulacoes_total: 3,
          precondicao_atendida: true,
          pdq: 1.333,
          meta_atingida: true,
          observacao_simplificacao_coautoria: 'NP estrito',
        },
        np_estrito: 4,
        np_teto: 5,
        publicacoes_confirmadas: [
          {
            id: 10,
            titulo: 'Nanomaterial Synthesis in Polymer Matrix',
            autores: 'Reconduzido, C. A.; Discente, L.',
            periodico: 'Applied Materials Today',
            ano: 2025,
            fator_impacto_jcr: 5.2,
            status_coautoria: 'confirmado',
            coautores_programa_nomes: ['Lucas Discente'],
          },
        ],
        publicacoes_pendentes: [],
        publicacoes_sem_coautoria: [],
        veredito: 'RECONDUZIDO',
        motivos: [],
      },
      {
        docente_id: 2,
        nome: 'Beatriz Nao Atende',
        categoria: 'permanente',
        scopus_id: '2222222222',
        id_lattes: '2222333344445555',
        criterio_i: {
          atendido: true,
          quantidade: 2,
          detalhe: '2 orientações principais',
          itens: [],
        },
        criterio_ii: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Nenhuma disciplina registrada',
          itens: [],
        },
        criterio_iii: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Nenhum projeto financiado',
          itens: [],
        },
        criterio_iv: {
          atendido: false,
          quantidade: 0,
          detalhe: 'PDQ 0.5 < 1.0',
        },
        pdq_detalhes: {
          np: 1,
          np_teto: 2,
          np_pendente: 1,
          msc: 2,
          dsc: 0,
          titulacoes_total: 2,
          precondicao_atendida: true,
          pdq: 0.5,
          meta_atingida: false,
          observacao_simplificacao_coautoria: 'NP estrito',
        },
        np_estrito: 1,
        np_teto: 2,
        publicacoes_confirmadas: [],
        publicacoes_pendentes: [],
        publicacoes_sem_coautoria: [],
        veredito: 'NAO_ATENDE',
        motivos: [
          'Critério II: Não ministrou disciplinas no P²CEM no quadriênio',
          'Critério III: Não participou de projeto com financiamento no quadriênio',
          'Critério IV: PDQ atingido (0.50) inferior à meta de 1.0',
        ],
      },
      {
        docente_id: 3,
        nome: 'Ledjane Silva Barreto',
        categoria: 'permanente',
        scopus_id: '7005598575',
        id_lattes: '3104369029830651',
        criterio_i: {
          atendido: true,
          quantidade: 2,
          detalhe: '2 orientações ativas no período',
          itens: [],
        },
        criterio_ii: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 disciplina vinculada',
          itens: [],
        },
        criterio_iii: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Projetos sem financiamento cadastrado',
          itens: [],
        },
        criterio_iv: {
          atendido: false,
          quantidade: 0,
          detalhe: 'PDQ indefinido: menos de 2 titulações concluídas no período (0)',
        },
        pdq_detalhes: {
          np: 2,
          np_teto: 2,
          np_pendente: 0,
          msc: 0,
          dsc: 0,
          titulacoes_total: 0,
          precondicao_atendida: false,
          pdq: null,
          meta_atingida: false,
          observacao_simplificacao_coautoria: 'NP estrito',
        },
        np_estrito: 2,
        np_teto: 2,
        publicacoes_confirmadas: [],
        publicacoes_pendentes: [],
        publicacoes_sem_coautoria: [],
        veredito: 'PDQ_INSUFICIENTE',
        motivos: [
          'Critério IV: Menos de 2 titulações concluídas no quadriênio (MSc: 0, DSc: 0; total: 0). Índice PDQ indefinido.',
        ],
      },
      {
        docente_id: 4,
        nome: 'Marcos Colaborador Externo',
        categoria: 'colaborador',
        scopus_id: null,
        id_lattes: null,
        criterio_i: {
          atendido: false,
          quantidade: 0,
          detalhe: '0 orientações',
        },
        criterio_ii: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 disciplina',
        },
        criterio_iii: {
          atendido: false,
          quantidade: 0,
          detalhe: '0 projetos',
        },
        criterio_iv: {
          atendido: false,
          quantidade: 0,
          detalhe: 'PDQ não calculado para colaboradores',
        },
        pdq_detalhes: {
          np: 0,
          np_teto: 0,
          np_pendente: 0,
          msc: 0,
          dsc: 0,
          titulacoes_total: 0,
          precondicao_atendida: false,
          pdq: null,
          meta_atingida: false,
          observacao_simplificacao_coautoria: 'NP estrito',
        },
        np_estrito: 0,
        np_teto: 0,
        publicacoes_confirmadas: [],
        publicacoes_pendentes: [],
        publicacoes_sem_coautoria: [],
        veredito: 'NAO_APLICAVEL',
        motivos: ['Docente colaborador / sem categoria permanente no quadriênio.'],
      },
    ],
  }

  it('renderiza o cabeçalho, descrição institucional e botões da página Recondução', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    expect(html).toContain('Norma de Recondução Docente')
    expect(html).toContain('Avaliação quadrienal de permanência docente no PPG-DCEM')
    expect(html).toContain('Atualizar')
    expect(html).toContain('data-testid="btn-atualizar-reconducao"')
  })

  it('renderiza os 5 cards de métricas no topo com números fiéis ao ResumoReconducao', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    // Total de docentes avaliados
    expect(html).toContain('data-testid="card-total-docentes"')
    expect(html).toContain('4')
    expect(html).toContain('3 perm. / 1 colab.')

    // Reconduzidos (1)
    expect(html).toContain('data-testid="card-reconduzidos"')
    expect(html).toContain('Reconduzidos')

    // Não atendem (1)
    expect(html).toContain('data-testid="card-nao-atendem"')
    expect(html).toContain('Não Atendem')

    // PDQ Insuficiente (1)
    expect(html).toContain('data-testid="card-pdq-insuficiente"')
    expect(html).toContain('PDQ Insuficiente')

    // Não Aplicáveis (1)
    expect(html).toContain('data-testid="card-nao-aplicavel"')
    expect(html).toContain('Não Aplicáveis')
  })

  it('renderiza os vereditos com badges coloridos e estilizados', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    expect(html).toContain('RECONDUZIDO')
    expect(html).toContain('NÃO ATENDE')
    expect(html).toContain('PDQ INSUFICIENTE')
    expect(html).toContain('NÃO APLICÁVEL')
  })

  it('exibe badges de categoria adequados (azul Permanente, âmbar Colaborador)', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    expect(html).toContain('Permanente')
    expect(html).toContain('bg-blue-100')
    expect(html).toContain('Colaborador')
    expect(html).toContain('bg-amber-50')
  })

  it('exibe o estado indefinido do PDQ com traço e motivo legível quando precondição < 2', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    // Para Ledjane ou Marcos, PDQ é indefinido (nunca 0)
    expect(html).toContain('—')
    expect(html).toContain('&lt;2 titulações (0)')
  })

  it('ordena os docentes seguindo a regra: Reconduzidos -> Não Atendem -> Insuficientes -> Não Aplicáveis', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: true,
            dados: dadosMock,
            origem: 'edge_function',
          })
        }
      />,
    )

    // Verifica a ordem de ocorrência das linhas no HTML
    const idxReconduzido = html.indexOf('Carlos Alberto Reconduzido')
    const idxNaoAtende = html.indexOf('Beatriz Nao Atende')
    const idxInsuficiente = html.indexOf('Ledjane Silva Barreto')
    const idxNaoAplicavel = html.indexOf('Marcos Colaborador Externo')

    expect(idxReconduzido).toBeGreaterThan(-1)
    expect(idxNaoAtende).toBeGreaterThan(-1)
    expect(idxInsuficiente).toBeGreaterThan(-1)
    expect(idxNaoAplicavel).toBeGreaterThan(-1)

    expect(idxReconduzido).toBeLessThan(idxNaoAtende)
    expect(idxNaoAtende).toBeLessThan(idxInsuficiente)
    expect(idxInsuficiente).toBeLessThan(idxNaoAplicavel)
  })

  it('renderiza estado de erro com botão "Tentar novamente" em caso de falha', () => {
    const html = renderToString(
      <Reconducao
        carregarDadosFn={() =>
          Promise.resolve({
            sucesso: false,
            mensagemErro: 'Falha simulada na leitura dos dados',
          })
        }
      />,
    )

    expect(html).toContain('Falha ao carregar os dados de recondução')
    expect(html).toContain('Falha simulada na leitura dos dados')
    expect(html).toContain('Tentar novamente')
  })
})
