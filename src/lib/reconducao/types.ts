import { ANO_INICIO, ANO_FIM } from '../lattes/quadrienio'

export { ANO_INICIO, ANO_FIM }

export type CategoriaDocente = 'permanente' | 'colaborador' | null

export type VereditoReconducao = 'RECONDUZIDO' | 'NAO_ATENDE' | 'PDQ_INSUFICIENTE' | 'NAO_APLICAVEL'

export interface CriterioEvidencia<T = any> {
  atendido: boolean
  detalhe: string
  quantidade: number
  itens?: T[]
}

export interface DetalhesPDQ {
  np: number // Número de publicações JCR >= 1.0 com coautoria confirmada no quadriênio
  np_teto?: number // Todas as publicações JCR >= 1.0 do docente no quadriênio
  np_pendente?: number // Publicações JCR >= 1.0 pendentes de confirmação de coautoria
  msc: number // Mestres formados no período (orientações mestrado concluídas)
  dsc: number // Doutores formados no período (orientações doutorado concluídas)
  titulacoes_total: number // msc + dsc
  precondicao_atendida: boolean // titulacoes_total >= 2
  pdq: number | null // np / (msc + dsc), null se precondição não atendida
  meta_atingida: boolean // pdq !== null && pdq >= 1.0
  observacao_simplificacao_coautoria: string
}

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
  scopus_id?: string | null
  id_lattes?: string | null

  // 4 Critérios da norma
  criterio_i: CriterioEvidencia // Orientaram alunos no P²CEM como orientador principal
  criterio_ii: CriterioEvidencia // Ministraram disciplinas no P²CEM
  criterio_iii: CriterioEvidencia // Participaram de projetos com financiamento
  criterio_iv: CriterioEvidencia // PDQ >= 1.0 com (MSc + DSc) >= 2

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
  nota_metodologica: {
    criterio_iv_np_coautoria: string
    criterio_ii_disciplinas_temporais: string
  }
  resumo: ResumoReconducao
  avaliacoes: AvaliacaoDocenteReconducao[]
}
