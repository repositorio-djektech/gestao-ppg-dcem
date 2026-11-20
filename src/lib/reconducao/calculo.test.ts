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

    it('atribui veredito NAO_APLICAVEL para colaboradores e categoria nula, mas computa métricas', () => {
      const docenteColaborador: Docente = {
        ...docentePermanente,
        id: 200,
        categoria: 'colaborador',
      }

      const resultado = avaliarDocente({
        docente: docenteColaborador,
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes: [],
      })

      expect(resultado.veredito).toBe('NAO_APLICAVEL')
      expect(resultado.categoria).toBe('colaborador')
      expect(resultado.motivos[0]).toContain('exclusivamente a docentes da categoria permanente')
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
      // Permanente sem orientação, disciplina nem projeto: critérios I a III não atendidos
      expect(relatorio.resumo.nao_atendem).toBe(1)
      expect(relatorio.resumo.pdq_insuficiente).toBe(0)
      expect(relatorio.resumo.nao_aplicavel).toBe(2)
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
