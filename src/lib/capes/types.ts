import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
  Patente,
  Egresso,
  Discente,
  IniciacaoCientifica,
} from '@/types/database'

export type QuesitoFicha = '1' | '2' | '3.1'

export interface TermoDecomposicao {
  termo: string
  descricao: string
  valor: number | string
}

export interface InsumoStatus {
  totalEsperado?: number
  totalExistente: number
  descricao: string
  atendido: boolean
}

export type StatusIndicador = 'calculado' | 'indefinido'

export interface ResultadoIndicador {
  id: string
  codigo: string
  nome: string
  quesito: QuesitoFicha
  itemFicha: string
  pesoPercentual: number // e.g. 15 para 15%
  pesoQuesitoGeral?: string
  formulaTexto: string
  status: StatusIndicador
  motivoIndefinido?: string
  valorCalculado: number | null
  unidade?: string // '%' ou número decimal ou índice
  decomposicao: TermoDecomposicao[]
  insumos: InsumoStatus[]
  observacoes?: string
}

export interface ResumoQuesito {
  quesito: QuesitoFicha
  titulo: string
  pesoTotalPercentual: number
  indicadores: ResultadoIndicador[]
}

export interface RelatorioIndicadoresCapes {
  anoReferencia: number
  quadrienio: {
    inicio: number
    fim: number
  }
  geradoEm: string
  resumoGeral: {
    totalIndicadores: number
    calculados: number
    indefinidos: number
    totalDP: number
    totalJdpValidos: number
    denominadorEfetivo: number // DP - JDP_validos
  }
  quesitos: ResumoQuesito[]
  todosIndicadores: ResultadoIndicador[]
}

export interface PublicacaoCoautorProgramaItem {
  id?: number
  publicacao_id: number
  discente_id?: number | null
  egresso_id?: number | null
  tipo: string
  nome_citado?: string
  grau_confianca?: number
}

export interface PublicacaoDocenteItem {
  id?: number
  publicacao_id: number
  docente_id: number
}

export interface DadosEntradaIndicadores {
  anoReferencia?: number
  anoInicio?: number
  anoFim?: number
  docentes: Docente[]
  orientacoes: Orientacao[]
  disciplinas: Disciplina[]
  projetos: ProjetoPesquisa[]
  projetosParticipantes: ProjetoParticipante[]
  publicacoes: Publicacao[]
  publicacoesDocentes?: PublicacaoDocenteItem[]
  publicacoesCoautores?: PublicacaoCoautorProgramaItem[]
  patentes: Patente[]
  egressos: Egresso[]
  discentes: Discente[]
  iniciacoesCientificas: IniciacaoCientifica[]
}
