import { describe, it, expect } from 'vitest'
import {
  gerarHtmlRelatorioReconducao,
  prepararDocentesParaImpressao,
  TEXTO_PARAGRAFO_4,
} from './imprimirReconducaoIframe'
import type { RelatorioReconducaoResposta } from './types'

describe('Gerador do Relatório de Recondução Impresso (Etapa E)', () => {
  const relatorioExemplo: RelatorioReconducaoResposta = {
    sucesso: true,
    gerado_em: '2026-11-15T10:00:00.000Z',
    quadrienio: {
      ano_inicio: 2025,
      ano_fim: 2028,
    },
    nota_metodologica: {
      criterio_iv_np_coautoria:
        'O NP estrito considera somente coautorias confirmadas com orientandos/egressos.',
      criterio_ii_disciplinas_temporais: 'Disciplinas ministradas no quadriênio 2025-2028.',
    },
    resumo: {
      ano_inicio: 2025,
      ano_fim: 2028,
      total_docentes: 4,
      total_permanentes: 2,
      total_colaboradores: 1,
      total_sem_categoria: 1,
      reconduzidos: 1,
      nao_atendem: 1,
      pdq_insuficiente: 1,
      nao_aplicavel: 1,
    },
    avaliacoes: [
      {
        docente_id: 1,
        nome: 'Docente Reconduzido Silva',
        categoria: 'permanente',
        scopus_id: '1234567890',
        id_lattes: '1111222233334444',
        criterio_i: {
          atendido: true,
          quantidade: 3,
          detalhe: '3 orientações principais',
          itens: [
            {
              tipo: 'Mestrado',
              discente: 'Aluno A',
              inicio: '2025',
              fim: '2026',
              data_defesa: '2026-03-10',
              status: 'concluido',
            },
          ],
        },
        criterio_ii: {
          atendido: true,
          quantidade: 2,
          detalhe: '2 disciplinas ministradas',
          itens: [{ nome: 'Ciência dos Materiais I', codigo: 'DCEM101', ano_semestre: '2025-1' }],
        },
        criterio_iii: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 projeto com financiamento CNPq',
          itens: [
            { titulo: 'Síntese de Grafeno', orgao_fomento: 'CNPq', inicio: '2025', fim: '2028' },
          ],
        },
        criterio_iv: {
          atendido: true,
          quantidade: 4,
          detalhe: 'PDQ 1.50 >= 1.0',
        },
        pdq_detalhes: {
          np: 3,
          np_teto: 4,
          np_pendente: 1,
          msc: 1,
          dsc: 1,
          titulacoes_total: 2,
          precondicao_atendida: true,
          pdq: 1.5,
          meta_atingida: true,
          observacao_simplificacao_coautoria: 'NP estrito',
        },
        np_estrito: 3,
        np_teto: 4,
        publicacoes_confirmadas: [
          {
            id: 10,
            titulo: 'Advanced Graphene Processing',
            autores: 'Silva, D. R.; Aluno, A.',
            periodico: 'Carbon',
            ano: 2026,
            fator_impacto_jcr: 10.5,
            status_coautoria: 'confirmado',
            coautores_programa_nomes: ['Aluno A'],
          },
        ],
        publicacoes_pendentes: [],
        publicacoes_sem_coautoria: [],
        veredito: 'RECONDUZIDO',
        motivos: [],
      },
      {
        docente_id: 2,
        nome: 'Docente Pendente Santos',
        categoria: 'permanente',
        scopus_id: null,
        id_lattes: null,
        criterio_i: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 orientação principal',
          itens: [],
        },
        criterio_ii: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Nenhuma disciplina',
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
          detalhe: 'PDQ 0.50 < 1.0',
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
        veredito: 'NAO_ATENDE',
        motivos: ['Critério II não atendido', 'Critério III não atendido', 'PDQ inferior a 1,0'],
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
          detalhe: '2 orientações principais',
          itens: [
            {
              tipo: 'Mestrado',
              discente: 'Discente 1',
              inicio: '2025',
              fim: '2026',
              data_defesa: null,
              status: 'ativo',
            },
          ],
        },
        criterio_ii: {
          atendido: true,
          quantidade: 1,
          detalhe: '1 disciplina ministrada',
          itens: [
            { nome: 'Tópicos Especiais em Materiais', codigo: 'DCEM200', ano_semestre: '2025-2' },
          ],
        },
        criterio_iii: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Nenhum projeto com financiamento formal cadastrado',
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
        veredito: 'PDQ_INSUFICIENTE',
        motivos: [
          'Critério IV: Menos de 2 titulações concluídas no quadriênio (MSc: 0, DSc: 0; total: 0). Índice PDQ indefinido.',
        ],
      },
      {
        docente_id: 4,
        nome: 'Colaborador Externo Pereira',
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
          detalhe: '1 disciplina ministrada',
        },
        criterio_iii: {
          atendido: false,
          quantidade: 0,
          detalhe: '0 projetos',
        },
        criterio_iv: {
          atendido: false,
          quantidade: 0,
          detalhe: 'Não avaliado para colaboradores',
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
        veredito: 'NAO_APLICAVEL',
        motivos: ['Docente colaborador / sem categoria permanente no quadriênio.'],
      },
    ],
  }

  it('contém a transcrição EXATA e literal do § 4º da norma no cabeçalho', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain(TEXTO_PARAGRAFO_4)
    expect(html).toContain(
      '§ 4º - Serão reconduzidos automaticamente à categoria de docente permanente',
    )
    expect(html).toContain('I. Orientaram alunos no P²CEM como orientador principal;')
    expect(html).toContain('II. Ministraram disciplinas no P²CEM;')
    expect(html).toContain('III. Participaram de projetos com financiamento;')
    expect(html).toContain(
      'IV. Alcançam índice de produção docente qualificada (PDQ) igual ou superior a 1,0',
    )
    expect(html).toContain('(MSc + DSc) ≥ 2.')
  })

  it('estrutura o documento na ordem requerida (Cabeçalho -> Resumo -> Quadro Geral -> Seções por Docente -> Nota Metodológica)', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)

    const posCabecalho = html.indexOf('Relatório de Avaliação de Recondução de Docentes — PPG-DCEM')
    const posParagrafo4 = html.indexOf(TEXTO_PARAGRAFO_4)
    const posResumo = html.indexOf('class="resumo-section"')
    const posQuadroGeral = html.indexOf('Quadro Geral Consolidado de Docentes')
    const posSecaoDocente = html.indexOf('class="docente-section"')
    const posNotaMetodologica = html.indexOf('Nota Metodológica e Ressalvas Técnicas')

    expect(posCabecalho).toBeGreaterThan(-1)
    expect(posParagrafo4).toBeGreaterThan(posCabecalho)
    expect(posResumo).toBeGreaterThan(posParagrafo4)
    expect(posQuadroGeral).toBeGreaterThan(posResumo)
    expect(posSecaoDocente).toBeGreaterThan(posQuadroGeral)
    expect(posNotaMetodologica).toBeGreaterThan(posSecaoDocente)
  })

  it('exibe as margens ABNT corretas no @page (2,5cm topo/esquerda e 2cm direita/baixo)', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('margin-top: 25mm;')
    expect(html).toContain('margin-left: 25mm;')
    expect(html).toContain('margin-right: 20mm;')
    expect(html).toContain('margin-bottom: 20mm;')
    expect(html).toContain('Times New Roman')
    expect(html).toContain('font-size: 12pt;')
  })

  it('configura quebra de folha para cada seção de docente', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('page-break-before: always;')
    expect(html).toContain('break-before: page;')
  })

  it('exibe a fórmula do PDQ e suas variáveis de forma explícita', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('PDQ = NP / (MSc + DSc)')
    expect(html).toContain('(MSc + DSc) &ge; 2')
    expect(html).toContain('NP Estrito (Confirmadas)')
    expect(html).toContain('NP Teto (Potenciais)')
    expect(html).toContain('Mestres (MSc)')
    expect(html).toContain('Doutores (DSc)')
  })

  it('exibe motivo legível para PDQ indefinido e não assume zero', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('Pré-condição (MSc + DSc) &ge; 2 não atendida')
    expect(html).toContain(
      'o índice PDQ permanece <span class="destaque-indefinido">indefinido</span>',
    )
  })

  it('exibe nota de aplicabilidade para docentes colaboradores ou sem categoria', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('Nota de Aplicabilidade')
    expect(html).toContain('aplica-se estritamente à categoria de <em>Docentes Permanentes</em>')
  })

  it('inclui na nota metodológica as ressalvas do NP estrito, coautorias pendentes e fontes cadastrais', () => {
    const html = gerarHtmlRelatorioReconducao(relatorioExemplo)
    expect(html).toContain('publicacoes_coautores_programa')
    expect(html).toContain('demandam deliberação do Colegiado')
    expect(html).toContain('declarações do programa')
  })

  it('ordena os docentes no relatório respeitando a ordem da página (Reconduzidos primeiro)', () => {
    const lista = prepararDocentesParaImpressao(relatorioExemplo)
    expect(lista[0].veredito).toBe('RECONDUZIDO')
    expect(lista[1].veredito).toBe('NAO_ATENDE')
    expect(lista[2].veredito).toBe('PDQ_INSUFICIENTE')
    expect(lista[3].veredito).toBe('NAO_APLICAVEL')
  })

  it('suporta emissão de dossiê para docente único quando docenteUnicoId é informado', () => {
    const htmlIndividual = gerarHtmlRelatorioReconducao(relatorioExemplo, {
      docenteUnicoId: 3,
    })

    // Deve conter Ledjane Barreto
    expect(htmlIndividual).toContain('Ledjane Silva Barreto')
    expect(htmlIndividual).toContain('7005598575')
    expect(htmlIndividual).toContain('Dossiê de Recondução — Ledjane Silva Barreto')
    // Não deve conter os outros docentes
    expect(htmlIndividual).not.toContain('Docente Reconduzido Silva')
    expect(htmlIndividual).not.toContain('Colaborador Externo Pereira')
    // Não renderiza quadro geral nem grid de métricas gerais
    expect(htmlIndividual).not.toContain('Quadro Geral Consolidado de Docentes')
  })

  it('reflete filtros de busca e veredito ativos', () => {
    const filtrados = prepararDocentesParaImpressao(relatorioExemplo, {
      filtroVeredito: 'RECONDUZIDO',
    })
    expect(filtrados).toHaveLength(1)
    expect(filtrados[0].nome).toBe('Docente Reconduzido Silva')

    const busca = prepararDocentesParaImpressao(relatorioExemplo, {
      termoBusca: 'Ledjane',
    })
    expect(busca).toHaveLength(1)
    expect(busca[0].nome).toBe('Ledjane Silva Barreto')
  })
})
