import { describe, it, expect } from 'vitest'
import {
  avaliarDocente,
  consolidarAvaliacaoReconducao,
  extrairAnoDeData,
  anoNoPeriodo,
  NOTA_SIMPLIFICACAO_NP,
} from './calculo'
import { avaliarCriterioIV } from '../../../supabase/functions/avaliacao-reconducao/pdq'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
} from '@/types/database'

describe('Cálculo de Recondução Docente (Etapa C)', () => {
  describe('Fórmula do PDQ da IN 02/2026: (2 × ATD) + DPIDE1 + DPTDE1 >= nota de corte', () => {
    const pub = (id: number, estrato: string, extra: Record<string, unknown> = {}) => ({
      id,
      ano: 2025,
      estrato_qualis: estrato,
      periodico: 'Revista Ficticia',
      ...extra,
    })
    const coaut = (ids: number[]) =>
      ids.map((id) => ({ publicacao_id: id, tipo: 'orientando', nome_citado: 'Aluno Ficticio' }))

    it('calcula o PDQ com ATD, DPIDE1 e DPTDE1 (1 mestrado, 1 doutorado)', () => {
      // A1 e A2 com discente: ATD = 2 / (1 + 2×1) = 0,667; DPIDE1 = 1 + 0,875 = 1,875; DPTDE1 = 2
      const r = avaliarCriterioIV({
        publicacoesDoDocente: [pub(1, 'A1'), pub(2, 'A2')],
        coautoresPrograma: coaut([1, 2]),
        egressos: [],
        msc: 1,
        dsc: 1,
      })
      expect(r.detalhes.atd).toBe(0.667)
      expect(r.detalhes.dpide1).toBe(1.875)
      expect(r.detalhes.dptde1).toBe(2)
      expect(r.detalhes.pdq).toBe(5.209) // 2×0,667 + 1,875 + 2
      expect(r.detalhes.meta_atingida).toBe(true)
      expect(r.atendido).toBe(true)
    })

    it('usa os coeficientes da ficha 2025: A4 = 0,675 e B1 satura em 1 por docente', () => {
      const r = avaliarCriterioIV({
        publicacoesDoDocente: [pub(1, 'A4'), pub(2, 'B1'), pub(3, 'B1'), pub(4, 'B1')],
        coautoresPrograma: coaut([1, 2, 3, 4]),
        egressos: [],
        msc: 0,
        dsc: 0,
      })
      expect(r.detalhes.dpide1_decomposicao.b1_bruto).toBe(3)
      expect(r.detalhes.dpide1_decomposicao.b1_saturado).toBe(1)
      expect(r.detalhes.dpide1).toBe(1.175) // 0,675 + 0,5
    })

    it('DPTDE1 tem teto de 4 e não conta capítulo; só publicação com coautoria entra', () => {
      const pubs = [1, 2, 3, 4, 5, 6].map((i) => pub(i, ''))
      pubs.push(pub(7, '', { tipo_producao: 'Capítulo' }) as any)
      const r = avaliarCriterioIV({
        publicacoesDoDocente: pubs,
        coautoresPrograma: coaut([1, 2, 3, 4, 5, 6, 7]),
        egressos: [],
        msc: 0,
        dsc: 0,
      })
      expect(r.detalhes.dptde1_bruto).toBe(6)
      expect(r.detalhes.dptde1).toBe(4)
      const semCoautoria = avaliarCriterioIV({
        publicacoesDoDocente: pubs,
        coautoresPrograma: [],
        egressos: [],
        msc: 0,
        dsc: 0,
      })
      expect(semCoautoria.detalhes.dptde1).toBe(0)
      expect(semCoautoria.detalhes.np_pendente).toBe(7)
    })

    it('sem titulações (M + 2D = 0) o ATD não é calculável e entra como 0 (nunca divide por zero)', () => {
      const r = avaliarCriterioIV({
        publicacoesDoDocente: [pub(1, 'A1')],
        coautoresPrograma: coaut([1]),
        egressos: [],
        msc: 0,
        dsc: 0,
      })
      expect(r.detalhes.atd_calculavel).toBe(false)
      expect(r.detalhes.atd).toBe(0)
      expect(r.detalhes.pdq).toBe(2) // DPIDE1 1 + DPTDE1 1
      expect(r.detalhe).toContain('sem titulações')
    })

    it('egresso só vale até 5 anos depois da titulação', () => {
      const egressos = [{ id: 9, ano_titulacao: 2018 }]
      const coautores = [{ publicacao_id: 1, tipo: 'egresso', egresso_id: 9 }]
      const dentro = avaliarCriterioIV({
        publicacoesDoDocente: [pub(1, 'A1', { ano: 2023 })],
        coautoresPrograma: coautores,
        egressos,
        msc: 1,
        dsc: 0,
      })
      expect(dentro.detalhes.np).toBe(1)
      const fora = avaliarCriterioIV({
        publicacoesDoDocente: [pub(1, 'A1', { ano: 2024 })],
        coautoresPrograma: coautores,
        egressos,
        msc: 1,
        dsc: 0,
      })
      expect(fora.detalhes.np).toBe(0)
    })

    it('a nota de corte decide o critério IV (padrão 1,0, ajustável)', () => {
      const base = {
        publicacoesDoDocente: [pub(1, 'A2')],
        coautoresPrograma: coaut([1]),
        egressos: [],
        msc: 1,
        dsc: 0,
      }
      // ATD 1/1 = 1 → 2 + DPIDE1 0,875 + DPTDE1 1 = 3,875
      expect(avaliarCriterioIV(base).atendido).toBe(true)
      expect(avaliarCriterioIV({ ...base, notaCorte: 4 }).atendido).toBe(false)
      expect(avaliarCriterioIV({ ...base, notaCorte: 4 }).motivo).toContain('nota de corte (4)')
      expect(avaliarCriterioIV(base).detalhes.nota_corte).toBe(1)
    })

    it('expõe a nota metodológica do PDQ da IN', () => {
      const r = avaliarCriterioIV({
        publicacoesDoDocente: [],
        coautoresPrograma: [],
        egressos: [],
        msc: 0,
        dsc: 0,
      })
      expect(r.detalhes.observacao_simplificacao_coautoria).toBe(NOTA_SIMPLIFICACAO_NP)
      expect(NOTA_SIMPLIFICACAO_NP).toContain('IN 02/2026')
    })
  })

  describe('Utilitários de data e período', () => {
    it('extrai ano de datas nos formatos ISO e texto', () => {
      expect(extrairAnoDeData('2025-11-20')).toBe(2025)
      expect(extrairAnoDeData('2026/1')).toBe(2026)
      expect(extrairAnoDeData('2027-2')).toBe(2027)
      expect(extrairAnoDeData(2028)).toBe(2028)
      expect(extrairAnoDeData('')).toBeNull()
      expect(extrairAnoDeData(null)).toBeNull()
    })

    it('valida se ano está no quadriênio 2025-2028', () => {
      expect(anoNoPeriodo(2025)).toBe(true)
      expect(anoNoPeriodo(2028)).toBe(true)
      expect(anoNoPeriodo(2024)).toBe(false)
      expect(anoNoPeriodo(2029)).toBe(false)
      expect(anoNoPeriodo(null)).toBe(false)
    })
  })

  describe('Avaliação Completa por Docente', () => {
    const docentePermanente: Docente = {
      id: 100,
      nome: 'Professora Exemplar da Silva',
      categoria: 'permanente',
      scopus_id: '123456',
      indice_h: 15,
      bolsa_cnpq: 'PQ-2',
      jdp: false,
      licenca: '',
      id_lattes: '1234567890123456',
    }

    it('atribui veredito RECONDUZIDO quando atende a todos os 4 critérios', () => {
      const orientacoes: Orientacao[] = [
        // Critério I + orientações concluídas para PDQ
        {
          id: 1,
          docente_id: 100,
          discente_id: 1,
          tipo: 'Mestrado',
          inicio: '2025',
          fim: '2026',
          status: 'concluido',
          data_defesa: '2026-03-15',
          flag_orientador_principal: true,
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          docente_id: 100,
          discente_id: 2,
          tipo: 'Doutorado',
          inicio: '2025',
          fim: '2027',
          status: 'concluido',
          data_defesa: '2027-08-20',
          flag_orientador_principal: true,
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const disciplinas: Disciplina[] = [
        {
          id: 1,
          docente_id: 100,
          nome: 'Ciência dos Materiais Avançada',
          codigo: 'CEM-001',
          creditos: 4,
          ano_semestre: '2025/1',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const projetos: ProjetoPesquisa[] = [
        {
          id: 1,
          coordenador_id: 100,
          titulo: 'Nanomateriais para Aplicações Biomédicas',
          descricao: '',
          inicio: '2025',
          fim: '2027',
          financiamento: true,
          orgao_fomento: 'CNPq',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const publicacoes: Publicacao[] = [
        {
          id: 1,
          titulo: 'Artigo de Alto Impacto A',
          autores: 'SILVA, Exemplar; ALUNO, João',
          periodico: 'Journal of Materials Science',
          ano: 2025,
          doi: '10.1000/1',
          fator_impacto_jcr: 3.456,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          titulo: 'Artigo de Alto Impacto B',
          autores: 'Silva, Exemplar; COLEGA, Maria',
          periodico: 'Ceramics International',
          ano: 2026,
          doi: '10.1000/2',
          fator_impacto_jcr: 2.15,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const coautoresPrograma = [
        { publicacao_id: 1, tipo: 'orientando', nome_citado: 'ALUNO, João' },
        { publicacao_id: 2, tipo: 'egresso', nome_citado: 'COLEGA, Maria' },
      ]

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes,
        disciplinas,
        projetos,
        participantesProjetos: [],
        publicacoes,
        coautoresPrograma,
      })

      expect(resultado.criterio_i.atendido).toBe(true)
      expect(resultado.criterio_ii.atendido).toBe(true)
      expect(resultado.criterio_iii.atendido).toBe(true)
      expect(resultado.criterio_iv.atendido).toBe(true)
      expect(resultado.pdq_detalhes.np).toBe(2)
      expect(resultado.pdq_detalhes.msc).toBe(1)
      expect(resultado.pdq_detalhes.dsc).toBe(1)
      // Sem Qualis cadastrado: ATD e DPIDE1 = 0; DPTDE1 = 2 artigos com coautoria
      expect(resultado.pdq_detalhes.pdq).toBe(2)
      expect(resultado.veredito).toBe('RECONDUZIDO')
      expect(resultado.motivos).toHaveLength(0)
    })

    it('atribui veredito PDQ_INSUFICIENTE quando I a III são atendidos e o PDQ fica abaixo da nota de corte', () => {
      const orientacoes: Orientacao[] = [
        {
          id: 1,
          docente_id: 100,
          discente_id: 1,
          tipo: 'Mestrado',
          inicio: '2025',
          fim: '2026',
          status: 'ativo', // Não concluído!
          flag_orientador_principal: true,
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const disciplinas: Disciplina[] = [
        {
          id: 1,
          docente_id: 100,
          nome: 'Disciplina A',
          codigo: 'A',
          creditos: 2,
          ano_semestre: '2025/1',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const projetos: ProjetoPesquisa[] = [
        {
          id: 1,
          coordenador_id: 100,
          titulo: 'Projeto A',
          descricao: '',
          inicio: '2025',
          fim: '2026',
          financiamento: true,
          orgao_fomento: 'FAPITEC',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const publicacoes: Publicacao[] = [
        {
          id: 1,
          titulo: 'Artigo A',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2025,
          doi: '',
          fator_impacto_jcr: 4.5,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes,
        disciplinas,
        projetos,
        participantesProjetos: [],
        publicacoes,
      })

      expect(resultado.criterio_i.atendido).toBe(true) // Tem orientação principal no período (mesmo ativa)
      expect(resultado.criterio_ii.atendido).toBe(true)
      expect(resultado.criterio_iii.atendido).toBe(true)
      expect(resultado.criterio_iv.atendido).toBe(false)
      expect(resultado.pdq_detalhes.pdq).toBe(0)
      expect(resultado.veredito).toBe('PDQ_INSUFICIENTE')
      expect(resultado.motivos.some((m) => m.includes('nota de corte'))).toBe(true)
    })

    it('atribui veredito NAO_ATENDE quando falham outros critérios como orientador principal ou projeto', () => {
      const orientacoes: Orientacao[] = [
        {
          id: 1,
          docente_id: 100,
          discente_id: 1,
          tipo: 'Mestrado',
          inicio: '2025',
          fim: '2026',
          status: 'concluido',
          data_defesa: '2026-05-10',
          flag_orientador_principal: false, // NÃO é orientador principal
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          docente_id: 100,
          discente_id: 2,
          tipo: 'Doutorado',
          inicio: '2025',
          fim: '2027',
          status: 'concluido',
          data_defesa: '2027-05-10',
          flag_orientador_principal: false,
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const publicacoes: Publicacao[] = [
        {
          id: 1,
          titulo: 'Artigo A',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2025,
          doi: '',
          fator_impacto_jcr: 2.0,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          titulo: 'Artigo B',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2026,
          doi: '',
          fator_impacto_jcr: 2.5,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const coautoresPrograma = [
        { publicacao_id: 1, tipo: 'orientando', nome_citado: 'Discente 1' },
        { publicacao_id: 2, tipo: 'egresso', nome_citado: 'Egresso 1' },
      ]

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes,
        disciplinas: [], // sem disciplinas
        projetos: [], // sem projetos
        participantesProjetos: [],
        publicacoes,
        coautoresPrograma,
      })

      // Pré-condição do PDQ está atendida (MSc=1, DSc=1 -> 2 titulações, PDQ = 2/2 = 1.0)
      expect(resultado.pdq_detalhes.precondicao_atendida).toBe(true)
      expect(resultado.criterio_iv.atendido).toBe(true)
      // Porém critérios I, II e III falharam
      expect(resultado.criterio_i.atendido).toBe(false)
      expect(resultado.criterio_ii.atendido).toBe(false)
      expect(resultado.criterio_iii.atendido).toBe(false)
      expect(resultado.veredito).toBe('NAO_ATENDE')
      expect(resultado.motivos).toHaveLength(3)
    })

    describe('colaboradores e visitantes (IN 02/2026, art. 11)', () => {
      const completo = {
        orientacoes: [
          {
            id: 1,
            docente_id: 200,
            discente_id: 1,
            tipo: 'Mestrado',
            inicio: '2025',
            fim: '2026',
            status: 'concluido',
            data_defesa: '2026-03-15',
            flag_orientador_principal: true,
          },
        ] as unknown as Orientacao[],
        disciplinas: [
          {
            id: 1,
            docente_id: 200,
            nome: 'Disc',
            codigo: 'D1',
            creditos: 4,
            ano_semestre: '2025/1',
          },
        ] as unknown as Disciplina[],
        projetos: [
          {
            id: 1,
            coordenador_id: 200,
            titulo: 'Proj',
            inicio: '2025',
            fim: '2027',
            financiamento: true,
            orgao_fomento: 'CNPq',
          },
        ] as unknown as ProjetoPesquisa[],
        participantesProjetos: [],
        publicacoes: [
          { id: 9, titulo: 'T', autores: 'Docente Exemplar', periodico: 'R', ano: 2026 },
        ] as unknown as Publicacao[],
        publicacoesDocentes: [{ publicacao_id: 9, docente_id: 200 }],
        coautoresPrograma: [{ publicacao_id: 9, tipo: 'orientando', nome_citado: 'Aluno' }],
      }

      it.each(['colaborador', 'visitante'] as const)(
        '%s que atende aos 4 critérios fica APTO_PERMANENTE (pode ser conduzido a permanente)',
        (categoria) => {
          const r = avaliarDocente({
            docente: { ...docentePermanente, id: 200, categoria },
            ...completo,
          })
          expect(r.veredito).toBe('APTO_PERMANENTE')
          expect(r.motivos.some((m) => m.includes('art. 11, §2º'))).toBe(true)
        },
      )

      it('colaborador que não atende é avaliado (NAO_ATENDE), com as métricas e os motivos', () => {
        const r = avaliarDocente({
          docente: { ...docentePermanente, id: 200, categoria: 'colaborador' },
          orientacoes: [],
          disciplinas: [],
          projetos: [],
          participantesProjetos: [],
          publicacoes: [],
        })
        expect(r.veredito).toBe('NAO_ATENDE')
        expect(r.categoria).toBe('colaborador')
        expect(r.motivos.some((m) => m.includes('Critério I não atendido'))).toBe(true)
      })

      it('só o critério IV falhando dá PDQ_INSUFICIENTE também para o colaborador', () => {
        const r = avaliarDocente({
          docente: { ...docentePermanente, id: 200, categoria: 'colaborador' },
          ...completo,
          notaCorte: 50,
        })
        expect(r.veredito).toBe('PDQ_INSUFICIENTE')
      })

      it('docente sem categoria não é avaliado: NAO_APLICAVEL, com o aviso para definir a categoria', () => {
        const r = avaliarDocente({
          docente: { ...docentePermanente, id: 200, categoria: null },
          orientacoes: [],
          disciplinas: [],
          projetos: [],
          participantesProjetos: [],
          publicacoes: [],
        })
        expect(r.veredito).toBe('NAO_APLICAVEL')
        expect(r.motivos.some((m) => m.includes('sem categoria definida'))).toBe(true)
      })
    })

    describe('publicação com dois docentes do programa (§7º): conta para um só', () => {
      const pubs = [
        { id: 50, titulo: 'T', autores: 'A; B', periodico: 'R', ano: 2026, estrato_qualis: 'A1' },
      ] as unknown as Publicacao[]
      const vinc = [
        { publicacao_id: 50, docente_id: 100 },
        { publicacao_id: 50, docente_id: 101 },
      ]
      const coaut = [
        { publicacao_id: 50, tipo: 'orientando', nome_citado: 'Aluno', discente_id: 7 },
      ]
      const avaliar = (id: number, extra: Record<string, unknown> = {}) =>
        avaliarDocente({
          docente: { ...docentePermanente, id },
          orientacoes: [],
          disciplinas: [],
          projetos: [],
          participantesProjetos: [],
          publicacoes: pubs,
          publicacoesDocentes: vinc,
          coautoresPrograma: coaut,
          ...extra,
        })

      it('vale para o orientador do discente coautor; o outro docente a recebe como cedida', () => {
        const extra = { discentes: [{ id: 7, docente_orientador_id: 101 }] }
        const a100 = avaliar(100, extra)
        const a101 = avaliar(101, extra)
        expect(a101.pdq_detalhes.np).toBe(1)
        expect(a100.pdq_detalhes.np).toBe(0)
        expect(a100.atribuicao?.cedidas.map((p) => p.id)).toEqual([50])
        expect(a100.atribuicao?.cedidas[0].creditados).toEqual([101])
      })

      it('a indicação do docente (docente_atribuido_id) vale mais que o orientador', () => {
        const comIndicacao = [{ ...pubs[0], docente_atribuido_id: 100 }] as unknown as Publicacao[]
        const extra = {
          publicacoes: comIndicacao,
          discentes: [{ id: 7, docente_orientador_id: 101 }],
        }
        expect(avaliar(100, extra).pdq_detalhes.np).toBe(1)
        expect(avaliar(101, extra).pdq_detalhes.np).toBe(0)
      })

      it('sem indicação e sem orientador que resolva: conta para os dois e fica em conflito', () => {
        const a100 = avaliar(100)
        const a101 = avaliar(101)
        expect(a100.pdq_detalhes.np).toBe(1)
        expect(a101.pdq_detalhes.np).toBe(1)
        expect(a100.atribuicao?.conflitos.map((p) => p.id)).toEqual([50])
      })

      it('publicação de um só docente do programa não é afetada', () => {
        const a = avaliarDocente({
          docente: { ...docentePermanente, id: 100 },
          orientacoes: [],
          disciplinas: [],
          projetos: [],
          participantesProjetos: [],
          publicacoes: pubs,
          publicacoesDocentes: [{ publicacao_id: 50, docente_id: 100 }],
          coautoresPrograma: coaut,
        })
        expect(a.pdq_detalhes.np).toBe(1)
        expect(a.atribuicao?.cedidas).toEqual([])
      })
    })

    it('traz os dados de desempate: bolsa, menor tempo de conclusão e ingresso na UFS', () => {
      const r = avaliarDocente({
        docente: { ...docentePermanente, bolsa_cnpq: 'PQ-1B', ingresso_ufs: '2008-03' } as Docente,
        orientacoes: [
          {
            id: 1,
            docente_id: 100,
            discente_id: 1,
            tipo: 'Mestrado',
            inicio: '2023-03',
            fim: '2025-02',
            status: 'concluido',
            flag_orientador_principal: true,
          },
        ] as unknown as Orientacao[],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [],
      })
      expect(r.desempate).toEqual({
        bolsa_cnpq: 'PQ-1B',
        nivel_bolsa: 4,
        menor_tempo_conclusao_meses: 23,
        ingresso_ufs: '2008-03',
      })
    })

    it('filtra publicações só pela janela da avaliação (sem corte por JCR, a IN usa o Qualis), separando confirmadas e pendentes', () => {
      const publicacoes: Publicacao[] = [
        {
          id: 1,
          titulo: 'Artigo JCR Baixo',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2025,
          doi: '',
          fator_impacto_jcr: 0.85, // sem corte por JCR: entra como pendente
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 2,
          titulo: 'Artigo Fora do Quadriênio',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2024, // 2024 -> fora de 2025-2028
          doi: '',
          fator_impacto_jcr: 5.2,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 3,
          titulo: 'Artigo Válido Confirmado',
          autores: 'Silva, Exemplar; Fonseca, Jander',
          periodico: 'Journal',
          ano: 2027,
          doi: '',
          fator_impacto_jcr: 1.0, // >= 1.0 -> conta
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 4,
          titulo: 'Artigo Válido Pendente de Confirmação',
          autores: 'Silva, Exemplar; Outro, Autor',
          periodico: 'Journal',
          ano: 2026,
          doi: '',
          fator_impacto_jcr: 2.5,
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const coautoresPrograma = [
        {
          publicacao_id: 3,
          tipo: 'orientando',
          nome_citado: 'JANDER LOPES FONSECA',
        },
      ]

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes,
        coautoresPrograma,
      })

      // NP estrito = apenas publicação 3 confirmada (1)
      expect(resultado.pdq_detalhes.np).toBe(1)
      expect(resultado.np_estrito).toBe(1)
      // NP Teto = publicações 3 e 4 (2)
      expect(resultado.np_teto).toBe(3)
      expect(resultado.pdq_detalhes.np_teto).toBe(3)
      expect(resultado.pdq_detalhes.np_pendente).toBe(2)

      expect(resultado.publicacoes_confirmadas).toHaveLength(1)
      expect(resultado.publicacoes_confirmadas?.[0]?.id).toBe(3)
      expect(resultado.publicacoes_pendentes).toHaveLength(2)
      expect(resultado.publicacoes_pendentes?.map((p) => p.id).sort()).toEqual([1, 4])
    })

    it('aceita participante via projetos_participantes para o Critério III', () => {
      const docentePart: Docente = {
        ...docentePermanente,
        id: 300,
        nome: 'Pesquisador Participante',
      }

      const projeto: ProjetoPesquisa = {
        id: 55,
        coordenador_id: 999, // coordenado por outro docente
        titulo: 'Projeto Colaborativo',
        descricao: '',
        inicio: '2025',
        fim: '2028',
        financiamento: true,
        orgao_fomento: 'FAPITEC',
        link_comprovacao: '',
        observacoes: '',
      }

      const participantes: ProjetoParticipante[] = [
        {
          projeto_id: 55,
          docente_id: 300,
          papel: 'Pesquisador',
        },
      ]

      const resultado = avaliarDocente({
        docente: docentePart,
        orientacoes: [],
        disciplinas: [],
        projetos: [projeto],
        participantesProjetos: participantes,
        publicacoes: [],
      })

      expect(resultado.criterio_iii.atendido).toBe(true)
      expect(resultado.criterio_iii.quantidade).toBe(1)
    })
  })

  describe('Etapa R4: Vínculos estruturados em publicacoes_docentes e fallback', () => {
    it('usa publicacoes_docentes preferencialmente para identificar as publicações do docente', () => {
      const docente: Docente = {
        id: 77,
        nome: 'Docente Teste Vinculo Estruturado',
        categoria: 'permanente',
        scopus_id: '',
        indice_h: 0,
        bolsa_cnpq: '',
        jdp: false,
        licenca: '',
      }

      // Publicação onde o texto de autores NÃO contém o nome do docente,
      // mas existe o vínculo estruturado em publicacoes_docentes
      const pubEstruturada: Publicacao = {
        id: 901,
        titulo: 'Artigo Vinculado Estruturalmente',
        autores: 'X, Y, Z',
        periodico: 'Revista Materiais',
        ano: 2025,
        fator_impacto_jcr: 2.5,
        doi: '',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const resultado = avaliarDocente({
        docente,
        orientacoes: [
          {
            id: 1,
            docente_id: 77,
            discente_id: 1,
            tipo: 'Mestrado',
            inicio: '2025',
            fim: '2026',
            status: 'concluido',
            data_defesa: '2025-06-01',
            flag_orientador_principal: true,
            link_comprovacao: '',
            observacoes: '',
          },
        ],
        disciplinas: [
          {
            id: 1,
            docente_id: 77,
            nome: 'Disciplina Teste',
            codigo: 'DISC01',
            creditos: 4,
            ano_semestre: '2025.1',
            link_comprovacao: '',
            observacoes: '',
          },
        ],
        projetos: [
          {
            id: 1,
            titulo: 'Projeto Teste',
            coordenador_id: 77,
            financiamento: true,
            orgao_fomento: 'CNPq',
            inicio: '2025',
            fim: '2028',
            descricao: '',
            link_comprovacao: '',
            observacoes: '',
          },
        ],
        participantesProjetos: [],
        publicacoes: [pubEstruturada],
        publicacoesDocentes: [{ publicacao_id: 901, docente_id: 77 }],
        coautoresPrograma: [{ publicacao_id: 901, tipo: 'orientando', nome_citado: 'Aluno Teste' }],
      })

      // Identificou via publicacoes_docentes e coautores confirmados
      expect(resultado.pdq_detalhes.np).toBe(1)
      expect(resultado.pdq_detalhes.np_teto).toBe(1)
      expect(resultado.np_estrito).toBe(1)
      expect(resultado.np_teto).toBe(1)
      expect(resultado.criterio_iv.atendido).toBe(true) // PDQ = DPTDE1 (1 artigo com coautoria) = 1,0 atinge a nota de corte padrão
    })

    it('quando não há registros estruturados em publicacoes_docentes para o docente, mantém fallback de texto de autores', () => {
      const docente: Docente = {
        id: 88,
        nome: 'Carlos Santos Silva',
        categoria: 'permanente',
        scopus_id: '',
        indice_h: 0,
        bolsa_cnpq: '',
        jdp: false,
        licenca: '',
      }

      const pubFallback: Publicacao = {
        id: 902,
        titulo: 'Artigo Fallback Textual',
        autores: 'Silva, Carlos Santos; Outro, A.',
        periodico: 'Revista Materiais',
        ano: 2025,
        fator_impacto_jcr: 1.5,
        doi: '',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const resultado = avaliarDocente({
        docente,
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [pubFallback],
        publicacoesDocentes: [],
        coautoresPrograma: [
          { publicacao_id: 902, tipo: 'orientando', nome_citado: 'Aluno Fallback' },
        ],
      })

      expect(resultado.pdq_detalhes.np).toBe(1)
      expect(resultado.pdq_detalhes.np_teto).toBe(1)
      expect(resultado.np_estrito).toBe(1)
      expect(resultado.np_teto).toBe(1)
    })
  })

  describe('Ciclo de 4 avaliações de colaboradores e visitantes (art. 11, §4º)', () => {
    const doc = (id: number, categoria: any): Docente =>
      ({
        id,
        nome: `Docente ${id}`,
        categoria,
        scopus_id: '',
        indice_h: 0,
        bolsa_cnpq: '',
        jdp: false,
        licenca: '',
      }) as Docente

    it('colaborador sem atender em 3 das 4 avaliações é apontado para descredenciamento', () => {
      const relatorio = consolidarAvaliacaoReconducao({
        docentes: [doc(1, 'colaborador'), doc(2, 'permanente')],
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [],
        anoAvaliacao: 2026,
        anoInicio: 2022,
        anoFim: 2025,
      })
      const colab = relatorio.avaliacoes.find((a) => a.docente_id === 1)!
      expect(colab.ciclo).toMatchObject({
        anos: [2023, 2024, 2025, 2026],
        reprovacoes: 4,
        descredenciar: true,
      })
      expect(colab.motivos.some((m) => m.includes('art. 11, §4º'))).toBe(true)
      // o ciclo só se aplica a colaborador e visitante
      expect(relatorio.avaliacoes.find((a) => a.docente_id === 2)!.ciclo).toBeUndefined()
    })

    it('colaborador que atende nos anos do ciclo não é apontado', () => {
      // orientação vigente, disciplina, projeto financiado e publicação com coautoria em todos os anos
      const relatorio = consolidarAvaliacaoReconducao({
        docentes: [doc(1, 'visitante')],
        orientacoes: [
          {
            id: 1,
            docente_id: 1,
            discente_id: 1,
            tipo: 'Mestrado',
            inicio: '2018',
            fim: '',
            status: 'em_andamento',
            flag_orientador_principal: true,
          },
        ] as unknown as Orientacao[],
        disciplinas: [
          { id: 1, docente_id: 1, nome: 'D', codigo: 'D', creditos: 4, ano_semestre: '' },
        ] as unknown as Disciplina[],
        projetos: [
          {
            id: 1,
            coordenador_id: 1,
            titulo: 'P',
            inicio: '2018',
            fim: '',
            financiamento: true,
            orgao_fomento: 'CNPq',
          },
        ] as unknown as ProjetoPesquisa[],
        participantesProjetos: [],
        publicacoes: [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((ano) => ({
          id: ano,
          titulo: `T${ano}`,
          autores: 'Docente 1',
          periodico: 'R',
          ano,
        })) as unknown as Publicacao[],
        publicacoesDocentes: [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((ano) => ({
          publicacao_id: ano,
          docente_id: 1,
        })),
        coautoresPrograma: [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((ano) => ({
          publicacao_id: ano,
          tipo: 'orientando',
          nome_citado: 'Aluno',
        })),
        anoAvaliacao: 2026,
        anoInicio: 2022,
        anoFim: 2025,
      })
      const v = relatorio.avaliacoes[0]
      expect(v.veredito).toBe('APTO_PERMANENTE')
      expect(v.ciclo).toMatchObject({ reprovacoes: 0, descredenciar: false })
      expect(relatorio.resumo.aptos_permanente).toBe(1)
    })

    it('a nota de corte de cada ano entra no ciclo (ano com nota alta reprova)', () => {
      const relatorio = consolidarAvaliacaoReconducao({
        docentes: [doc(1, 'colaborador')],
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [],
        notasCortePorAno: { 2023: 0, 2024: 0 },
        anoAvaliacao: 2026,
        anoInicio: 2022,
        anoFim: 2025,
      })
      // sem orientação/disciplina/projeto os critérios I a III falham de qualquer forma: 4 reprovações
      expect(relatorio.avaliacoes[0].ciclo?.reprovacoes).toBe(4)
    })
  })

  describe('Consolidação geral do relatório', () => {
    it('gera resumo completo com totais por categoria e por veredito', () => {
      const docentes: Docente[] = [
        {
          id: 1,
          nome: 'Docente Permanente 1',
          categoria: 'permanente',
          scopus_id: '',
          indice_h: 0,
          bolsa_cnpq: '',
          jdp: false,
          licenca: '',
        },
        {
          id: 2,
          nome: 'Docente Colaborador 2',
          categoria: 'colaborador',
          scopus_id: '',
          indice_h: 0,
          bolsa_cnpq: '',
          jdp: false,
          licenca: '',
        },
        {
          id: 3,
          nome: 'Docente Sem Categoria 3',
          categoria: null,
          scopus_id: '',
          indice_h: 0,
          bolsa_cnpq: '',
          jdp: false,
          licenca: '',
        },
      ]

      const relatorio = consolidarAvaliacaoReconducao({
        docentes,
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [],
      })

      expect(relatorio.sucesso).toBe(true)
      expect(relatorio.quadrienio.ano_inicio).toBe(2025)
      expect(relatorio.quadrienio.ano_fim).toBe(2028)
      expect(relatorio.resumo.total_docentes).toBe(3)
      expect(relatorio.resumo.total_permanentes).toBe(1)
      expect(relatorio.resumo.total_colaboradores).toBe(1)
      expect(relatorio.resumo.total_sem_categoria).toBe(1)
      // Sem orientação, disciplina nem projeto, os critérios I a III não são atendidos: o permanente e
      // o colaborador (avaliado também, art. 7º) não atendem; sem categoria não se aplica
      expect(relatorio.resumo.nao_atendem).toBe(2)
      expect(relatorio.resumo.pdq_insuficiente).toBe(0)
      expect(relatorio.resumo.nao_aplicavel).toBe(1)
      expect(relatorio.limite_colaboradores).toMatchObject({
        permanentes: 1,
        colaboradores: 1,
        limite: 0,
        excede: true,
      })
      expect(relatorio.avaliacoes).toHaveLength(3)
      // Avaliação do docente (D-36): janela dos 4 anos anteriores e nota de corte padrão
      expect(relatorio.avaliacao).toEqual({
        ano_avaliacao: 2029,
        ano_inicio: 2025,
        ano_fim: 2028,
        nota_corte: 1,
      })
    })
  })
})
