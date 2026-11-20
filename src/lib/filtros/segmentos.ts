/**
 * Filtros por curso (mestrado/doutorado) e por situação das telas Orientações, Discentes e Egressos
 * (D-35). Funções puras: as telas só escolhem o segmento e filtram a lista que já carregaram.
 */
import { calcularStatusEfetivoOrientacao } from '@/lib/orientacoes/status'
import { ehTipoIniciacao } from '@/lib/orientacoes/tipos'
import { statusEfetivoDiscente } from '@/lib/discentes/status'

function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export type Curso = 'Mestrado' | 'Doutorado'

/** Mestrado ou Doutorado; qualquer outro valor (vazio, pós-doutorado, graduação) devolve null. */
export function normalizarCurso(valor: unknown): Curso | null {
  const t = normalizar(valor)
  if (t === 'mestrado') return 'Mestrado'
  if (t === 'doutorado') return 'Doutorado'
  return null
}

export type FiltroCurso = 'todos' | 'Mestrado' | 'Doutorado' | 'sem_curso'

export const OPCOES_FILTRO_CURSO: Array<{ valor: FiltroCurso; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'Mestrado', rotulo: 'Mestrado' },
  { valor: 'Doutorado', rotulo: 'Doutorado' },
  { valor: 'sem_curso', rotulo: 'Sem curso' },
]

/** Item (discente ou egresso) do curso escolhido. "Sem curso" lista o que a coordenação precisa completar. */
export function itemDoCurso(tipoCurso: unknown, filtro: FiltroCurso): boolean {
  if (filtro === 'todos') return true
  const curso = normalizarCurso(tipoCurso)
  if (filtro === 'sem_curso') return curso === null
  return curso === filtro
}

export type FiltroTipoOrientacao = 'todos' | 'Mestrado' | 'Doutorado' | 'iniciacao' | 'outros'

export const OPCOES_FILTRO_TIPO_ORIENTACAO: Array<{ valor: FiltroTipoOrientacao; rotulo: string }> =
  [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'Mestrado', rotulo: 'Mestrado' },
    { valor: 'Doutorado', rotulo: 'Doutorado' },
    { valor: 'iniciacao', rotulo: 'Iniciação' },
    { valor: 'outros', rotulo: 'Outros' },
  ]

export function orientacaoDoTipo(tipo: unknown, filtro: FiltroTipoOrientacao): boolean {
  if (filtro === 'todos') return true
  const curso = normalizarCurso(tipo)
  if (filtro === 'Mestrado' || filtro === 'Doutorado') return curso === filtro
  const iniciacao = ehTipoIniciacao(tipo as string)
  if (filtro === 'iniciacao') return iniciacao
  return curso === null && !iniciacao
}

export type FiltroSituacao = 'todas' | 'em_andamento' | 'concluido' | 'cancelado'

export const OPCOES_FILTRO_SITUACAO: Array<{ valor: FiltroSituacao; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluídas' },
  { valor: 'cancelado', rotulo: 'Canceladas' },
]

/** Situação efetiva (derivada do mês do término, D-29), não o texto gravado. */
export function orientacaoNaSituacao(
  o: { status?: string | null; fim?: string | null; cancelado?: boolean | null },
  filtro: FiltroSituacao,
  hoje: Date = new Date(),
): boolean {
  if (filtro === 'todas') return true
  return calcularStatusEfetivoOrientacao(o, hoje) === filtro
}

export type FiltroSituacaoDiscente = 'todas' | 'em_andamento' | 'titulado' | 'desligado'

export const OPCOES_FILTRO_SITUACAO_DISCENTE: Array<{
  valor: FiltroSituacaoDiscente
  rotulo: string
}> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'titulado', rotulo: 'Tituladas' },
  { valor: 'desligado', rotulo: 'Desligadas' },
]

/** Situação efetiva do discente (conclusão por mês, D-29), não o texto gravado. */
export function discenteNaSituacao(
  d: {
    status?: string | null
    ano_conclusao?: string | number | null
    data_conclusao?: string | null
  },
  filtro: FiltroSituacaoDiscente,
  hoje: Date = new Date(),
): boolean {
  if (filtro === 'todas') return true
  return statusEfetivoDiscente(d, hoje) === filtro
}
