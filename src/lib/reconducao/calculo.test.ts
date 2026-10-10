import { describe, it, expect } from 'vitest'
import {
  calcularPDQ,
  avaliarDocente,
  consolidarAvaliacaoReconducao,
  extrairAnoDeData,
  anoNoPeriodo,
  NOTA_SIMPLIFICACAO_NP,
} from './calculo'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
} from '@/types/database'

describe('Cálculo de Recondução Docente (Etapa C)', () => {
  describe('Fórmula do PDQ e Pré-condição (MSc + DSc >= 2)', () => {
    it('calcula PDQ corretamente quando pré-condição é atendida e PDQ >= 1.0', () => {
      // Ex: 3 publicações JCR>=1.0, 1 mestrado concluído, 1 doutorado concluído -> PDQ = 3 / 2 = 1.5
      const res = calcularPDQ(3, 1, 1)
      expect(res.precondicao_atendida).toBe(true)
      expect(res.titulacoes_total).toBe(2)
      expect(res.pdq).toBe(1.5)
      expect(res.meta_atingida).toBe(true)
    })

    it('rejeita PDQ quando valor fica < 1.0', () => {
      // Ex: 1 publicação JCR>=1.0, 2 mestrados concluídos -> PDQ = 1 / 2 = 0.5
      const res = calcularPDQ(1, 2, 0)
      expect(res.precondicao_atendida).toBe(true)
      expect(res.titulacoes_total).toBe(2)
      expect(res.pdq).toBe(0.5)
      expect(res.meta_atingida).toBe(false)
    })

    it('mantém PDQ como null (indefinido/insuficiente) quando MSc + DSc < 2, NUNCA 0', () => {
      // Ex: 5 publicações, mas apenas 1 mestrado concluído
      const res1 = calcularPDQ(5, 1, 0)
      expect(res1.precondicao_atendida).toBe(false)
      expect(res1.titulacoes_total).toBe(1)
      expect(res1.pdq).toBeNull()
      expect(res1.meta_atingida).toBe(false)

      // Ex: 10 publicações, nenhuma titulação concluída
      const res0 = calcularPDQ(10, 0, 0)
      expect(res0.precondicao_atendida).toBe(false)
      expect(res0.titulacoes_total).toBe(0)
      expect(res0.pdq).toBeNull()
    })

    it('expõe nota explicativa de simplificação de coautoria orientando/egresso', () => {
      const res = calcularPDQ(2, 1, 1)
      expect(res.observacao_simplificacao_coautoria).toBe(NOTA_SIMPLIFICACAO_NP)
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

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes,
        disciplinas,
        projetos,
        participantesProjetos: [],
        publicacoes,
      })

      expect(resultado.criterio_i.atendido).toBe(true)
      expect(resultado.criterio_ii.atendido).toBe(true)
      expect(resultado.criterio_iii.atendido).toBe(true)
      expect(resultado.criterio_iv.atendido).toBe(true)
      expect(resultado.pdq_detalhes.np).toBe(2)
      expect(resultado.pdq_detalhes.msc).toBe(1)
      expect(resultado.pdq_detalhes.dsc).toBe(1)
      expect(resultado.pdq_detalhes.pdq).toBe(1.0)
      expect(resultado.veredito).toBe('RECONDUZIDO')
      expect(resultado.motivos).toHaveLength(0)
    })

    it('atribui veredito PDQ_INSUFICIENTE quando docente permanente não tem 2 titulações concluídas', () => {
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
      expect(resultado.pdq_detalhes.pdq).toBeNull()
      expect(resultado.veredito).toBe('PDQ_INSUFICIENTE')
      expect(resultado.motivos.some((m) => m.includes('mínimo de 2 titulações'))).toBe(true)
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

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes,
        disciplinas: [], // sem disciplinas
        projetos: [], // sem projetos
        participantesProjetos: [],
        publicacoes,
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

    it('filtra publicações pelo limiar de JCR >= 1.0 e pelo quadriênio 2025-2028', () => {
      const publicacoes: Publicacao[] = [
        {
          id: 1,
          titulo: 'Artigo JCR Baixo',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2025,
          doi: '',
          fator_impacto_jcr: 0.85, // < 1.0 -> não conta
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
          titulo: 'Artigo Válido',
          autores: 'Silva, Exemplar',
          periodico: 'Journal',
          ano: 2027,
          doi: '',
          fator_impacto_jcr: 1.0, // >= 1.0 -> conta
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const resultado = avaliarDocente({
        docente: docentePermanente,
        orientacoes: [],
        disciplinas: [],
        projetos: [],
        participantesProjetos: [],
        publicacoes,
      })

      expect(resultado.pdq_detalhes.np).toBe(1)
      expect(resultado.criterio_iv.itens).toHaveLength(1)
      expect(resultado.criterio_iv.itens?.[0]?.id).toBe(3)
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
      expect(relatorio.resumo.pdq_insuficiente).toBe(1)
      expect(relatorio.resumo.nao_aplicavel).toBe(2)
      expect(relatorio.avaliacoes).toHaveLength(3)
    })
  })
})
