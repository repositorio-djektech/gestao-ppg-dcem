import { ANO_INICIO, ANO_FIM } from '../lattes/quadrienio'

export { ANO_INICIO, ANO_FIM }

export type CategoriaDocente = 'permanente' | 'colaborador' | 'visitante' | 'jdp' | null

export type VereditoReconducao = 'RECONDUZIDO' | 'NAO_ATENDE' | 'PDQ_INSUFICIENTE' | 'NAO_APLICAVEL'

export interface CriterioEvidencia<T = any> {
  atendido: boolean
  detalhe: string
  quantidade: number
  itens?: T[]
}

import type { DetalhesPDQ as DetalhesPDQIN } from '../../../supabase/functions/avaliacao-reconducao/pdq'

type CamposPDQNovos =
  | 'atd'
  | 'atd_calculavel'
  | 'atd_artigos'
  | 'dpide1'
  | 'dpide1_decomposicao'
  | 'dptde1'
  | 'dptde1_bruto'
  | 'nota_corte'

/**
 * Detalhes do PDQ (D-36: 2×ATD + DPIDE1 + DPTDE1 contra a nota de corte). Os campos da IN são
 * opcionais aqui só para aceitar relatórios gravados antes dessa regra; o cálculo sempre os preenche.
 */
export type DetalhesPDQ = Omit<DetalhesPDQIN, CamposPDQNovos | 'pdq'> &
  Partial<Pick<DetalhesPDQIN, CamposPDQNovos>> & { pdq: number | null }

export interface PublicacaoComStatusCoautoria {
  id: number
  titulo: string
  autores: string
  periodico: string
  ano: number
  fator_impacto_jcr?: number | null
  status_coautoria: 'confirmado' | 'pendente' | 'sem_coautoria'
  coautores_programa_nomes?: string[]
}

export interface AvaliacaoDocenteReconducao {
  docente_id: number
  nome: string
  categoria: CategoriaDocente
  status?: boolean
  scopus_id?: string | null
  id_lattes?: string | null

  // 4 Critérios da norma
  criterio_i: CriterioEvidencia // Orientaram alunos no P²CEM como orientador principal
  criterio_ii: CriterioEvidencia // Ministraram disciplinas no P²CEM
  criterio_iii: CriterioEvidencia // Participaram de projetos com financiamento
  criterio_iv: CriterioEvidencia // PDQ (2×ATD + DPIDE1 + DPTDE1) >= nota de corte (IN 02/2026)

  // Detalhamento do cálculo PDQ
  pdq_detalhes: DetalhesPDQ

  // Métricas do NP
  np_estrito?: number
  np_teto?: number
  publicacoes_confirmadas?: PublicacaoComStatusCoautoria[]
  publicacoes_pendentes?: PublicacaoComStatusCoautoria[]
  publicacoes_sem_coautoria?: PublicacaoComStatusCoautoria[]

  // Veredito e justificativas
  veredito: VereditoReconducao
  motivos: string[]
}

export interface ResumoReconducao {
  ano_inicio: number
  ano_fim: number
  total_docentes: number
  total_permanentes: number
  total_colaboradores: number
  total_sem_categoria: number
  reconduzidos: number
  nao_atendem: number
  pdq_insuficiente: number
  nao_aplicavel: number
}

export interface RelatorioReconducaoResposta {
  sucesso: boolean
  gerado_em: string
  quadrienio: {
    ano_inicio: number
    ano_fim: number
  }
  /** Avaliação do docente (D-36): ano, janela dos 4 anos anteriores e nota de corte usada. */
  avaliacao?: {
    ano_avaliacao: number
    ano_inicio: number
    ano_fim: number
    nota_corte: number
  }
  nota_metodologica: {
    criterio_iv_np_coautoria: string
    criterio_ii_disciplinas_temporais: string
  }
  resumo: ResumoReconducao
  avaliacoes: AvaliacaoDocenteReconducao[]
}
