import { describe, it, expect, vi } from 'vitest'
import { obterAvaliacaoReconducao } from './reconducao'
import { avaliarDocente } from '@/lib/reconducao/calculo'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
} from '@/types/database'

describe('Service obterAvaliacaoReconducao (Etapa C)', () => {
  it('retorna dados a partir da edge function quando disponível', async () => {
    const mockData = {
      sucesso: true,
      gerado_em: '2026-10-10T12:00:00.000Z',
      quadrienio: {
        ano_inicio: 2025,
        ano_fim: 2028,
      },
      nota_metodologica: {
        criterio_iv_np_coautoria: 'Nota teste',
        criterio_ii_disciplinas_temporais: 'Nota teste',
      },
      resumo: {
        ano_inicio: 2025,
        ano_fim: 2028,
        total_docentes: 1,
        total_permanentes: 1,
        total_colaboradores: 0,
        total_sem_categoria: 0,
        reconduzidos: 1,
        nao_atendem: 0,
        pdq_insuficiente: 0,
        nao_aplicavel: 0,
      },
      avaliacoes: [
        {
          docente_id: 4,
          nome: 'Ledjane Silva Barreto',
          categoria: 'permanente',
          scopus_id: '7005598575',
          id_lattes: '3104369029830651',
          criterio_i: { atendido: true, quantidade: 2, detalhe: '2 orientações principais' },
          criterio_ii: { atendido: true, quantidade: 1, detalhe: '1 disciplina' },
          criterio_iii: { atendido: true, quantidade: 1, detalhe: '1 projeto' },
          criterio_iv: { atendido: true, quantidade: 3, detalhe: 'PDQ 1.5' },
          pdq_detalhes: {
            np: 3,
            msc: 1,
            dsc: 1,
            titulacoes_total: 2,
            precondicao_atendida: true,
            pdq: 1.5,
            meta_atingida: true,
            observacao_simplificacao_coautoria: 'Nota teste',
          },
          veredito: 'RECONDUZIDO',
          motivos: [],
        },
      ],
    }

    const mockInvoke = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    })

    const resultado = await obterAvaliacaoReconducao({ invokeFn: mockInvoke })

    expect(resultado.sucesso).toBe(true)
    expect(resultado.origem).toBe('edge_function')
    expect(resultado.dados?.avaliacoes).toHaveLength(1)
    expect(resultado.dados?.avaliacoes[0].nome).toBe('Ledjane Silva Barreto')
    expect(resultado.dados?.avaliacoes[0].veredito).toBe('RECONDUZIDO')
    expect(mockInvoke).toHaveBeenCalledWith('avaliacao-reconducao', {
      body: { anoInicio: 2025, anoFim: 2028 },
    })
  })

  it('lida com falha da edge function acionando fallback local com segurança', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Função indisponível'),
    })

    const resultado = await obterAvaliacaoReconducao({ invokeFn: mockInvoke })
    expect(resultado).toBeDefined()
    expect(typeof resultado.sucesso).toBe('boolean')
  })

  describe('Caso Ledjane Silva Barreto (Dados reais e integridade)', () => {
    // Dados reais da Ledjane existentes no banco de produção
    const docenteLedjane: Docente = {
      id: 4,
      nome: 'Ledjane Silva Barreto',
      categoria: 'permanente',
      scopus_id: '7005598575',
      id_lattes: '3104369029830651',
      openalex_id: null,
      indice_h: 21,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    }

    // Exemplos de registros simulando o perfil real da Ledjane no banco
    const orientacoesLedjane: Orientacao[] = [
      {
        id: 4,
        docente_id: 4,
        discente_id: 4,
        tipo: 'Mestrado',
        inicio: '2026',
        fim: '2026',
        status: 'ativo',
        flag_orientador_principal: true,
        link_comprovacao: '',
        observacoes: '',
      },
      {
        id: 5,
        docente_id: 4,
        discente_id: 5,
        tipo: 'Doutorado',
        inicio: '2025',
        fim: '2025',
        status: 'ativo',
        flag_orientador_principal: true,
        link_comprovacao: '',
        observacoes: '',
      },
    ]

    const projetosLedjane: ProjetoPesquisa[] = [
      {
        id: 5,
        coordenador_id: 4,
        titulo: 'EDUCAÇÃO VOCACIONAL PARA CIÊNCIA E TECNOLOGIA DE CERÂMICAS (EVOCER)',
        descricao: '',
        inicio: '2025',
        fim: 'Atual',
        financiamento: false,
        orgao_fomento: '',
        link_comprovacao: '',
        observacoes: '',
      },
    ]

    const publicacoesLedjane: Publicacao[] = [
      {
        id: 2,
        titulo:
          'Effects of ethylene glycol and nano-CaCO3 on carbonation and self-healing potential',
        autores:
          'SANTOS, HERICLES CAMPOS DOS; PRUDENTE, ISIS NAYRA ROLEMBERG; Barreto, Ledjane Silva',
        periodico: 'Construction and Building Materials',
        ano: 2025,
        doi: '10.1016/j.conbuildmat.2025.123456',
        fator_impacto_jcr: 7.4,
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      },
      {
        id: 3,
        titulo: 'Carbon-based materials from renewable sources: Challenges and perspectives',
        autores: 'DE ALMEIDA, YSLAINE ANDRADE; DE FATIMA GIMENEZ, IARA; Barreto, Ledjane Silva',
        periodico: 'Journal of Cleaner Production',
        ano: 2025,
        doi: '10.1016/j.jclepro.2025.123456',
        fator_impacto_jcr: 11.1,
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      },
    ]

    it('avalia Ledjane sem lançar erro, preservando imutabilidade do scopus_id e dados', () => {
      const resultado = avaliarDocente({
        docente: docenteLedjane,
        orientacoes: orientacoesLedjane,
        disciplinas: [],
        projetos: projetosLedjane,
        participantesProjetos: [],
        publicacoes: publicacoesLedjane,
      })

      // Docente e identificadores preservados
      expect(resultado.docente_id).toBe(4)
      expect(resultado.nome).toBe('Ledjane Silva Barreto')
      expect(resultado.categoria).toBe('permanente')
      expect(resultado.scopus_id).toBe('7005598575')
      expect(resultado.id_lattes).toBe('3104369029830651')

      // Critério I atendido: orientadora principal nas orientações ativas no período
      expect(resultado.criterio_i.atendido).toBe(true)
      expect(resultado.criterio_i.quantidade).toBe(2)

      // NP contabilizado (2 publicações com JCR 7.4 e 11.1 >= 1.0)
      expect(resultado.pdq_detalhes.np).toBe(2)

      // Orientações ainda ativas (não concluídas): titulações MSc + DSc = 0 < 2
      expect(resultado.pdq_detalhes.titulacoes_total).toBe(0)
      expect(resultado.pdq_detalhes.precondicao_atendida).toBe(false)
      expect(resultado.pdq_detalhes.pdq).toBeNull()

      // Veredito PDQ_INSUFICIENTE (pois categoria é permanente e faltam titulações concluídas)
      expect(resultado.veredito).toBe('PDQ_INSUFICIENTE')
      expect(resultado.motivos.some((m) => m.includes('mínimo de 2 titulações concluídas'))).toBe(
        true,
      )
    })

    it('quando Ledjane tem titulações concluídas e projeto financiado, atinge RECONDUZIDO', () => {
      const orientacoesCompletas: Orientacao[] = [
        ...orientacoesLedjane,
        {
          id: 50,
          docente_id: 4,
          discente_id: 10,
          tipo: 'Mestrado',
          inicio: '2025',
          fim: '2026',
          status: 'concluido',
          data_defesa: '2026-06-15',
          flag_orientador_principal: true,
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 51,
          docente_id: 4,
          discente_id: 11,
          tipo: 'Doutorado',
          inicio: '2025',
          fim: '2027',
          status: 'concluido',
          data_defesa: '2027-11-20',
          flag_orientador_principal: true,
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const disciplinasLedjane: Disciplina[] = [
        {
          id: 4,
          docente_id: 4,
          nome: 'Caracterização dos materiais',
          codigo: 'P2CEM0219',
          creditos: 2,
          ano_semestre: '2026-2',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const projetosFinanciados: ProjetoPesquisa[] = [
        {
          id: 5,
          coordenador_id: 4,
          titulo: 'Projeto Cerâmicos Financiado',
          descricao: '',
          inicio: '2025',
          fim: '2027',
          financiamento: true,
          orgao_fomento: 'FAPITEC/SE',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const resultado = avaliarDocente({
        docente: docenteLedjane,
        orientacoes: orientacoesCompletas,
        disciplinas: disciplinasLedjane,
        projetos: projetosFinanciados,
        participantesProjetos: [],
        publicacoes: publicacoesLedjane,
      })

      expect(resultado.criterio_i.atendido).toBe(true)
      expect(resultado.criterio_ii.atendido).toBe(true)
      expect(resultado.criterio_iii.atendido).toBe(true)
      expect(resultado.criterio_iv.atendido).toBe(true)
      expect(resultado.pdq_detalhes.np).toBe(2)
      expect(resultado.pdq_detalhes.msc).toBe(1)
      expect(resultado.pdq_detalhes.dsc).toBe(1)
      expect(resultado.pdq_detalhes.pdq).toBe(1.0) // 2 / (1 + 1) = 1.0
      expect(resultado.veredito).toBe('RECONDUZIDO')
      expect(resultado.motivos).toHaveLength(0)
    })
  })
})
