/**
 * Tipos de iniciação (D-30): Iniciação Científica, Tecnológica e em Extensão.
 *
 * Existem em duas telas e ficam sincronizados no banco (migração 20261119130000):
 * - Orientações guarda o tipo como texto ("Iniciação Científica", ...);
 * - Iniciações guarda um código (`iniciacao_cientifica`, `iniciacao_tecnologica`, `iniciacao_extensao`).
 */

export const TIPOS_INICIACAO_ORIENTACAO = [
  'Iniciação Científica',
  'Iniciação Tecnológica',
  'Iniciação em Extensão',
] as const

export type TipoIniciacaoCodigo =
  | 'iniciacao_cientifica'
  | 'iniciacao_tecnologica'
  | 'iniciacao_extensao'

const PAR: Array<[string, TipoIniciacaoCodigo]> = [
  ['iniciacao cientifica', 'iniciacao_cientifica'],
  ['iniciacao tecnologica', 'iniciacao_tecnologica'],
  ['iniciacao em extensao', 'iniciacao_extensao'],
]

function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Código de Iniciações para um tipo de Orientações; null se não é iniciação. */
export function codigoDeTipoOrientacao(tipo: unknown): TipoIniciacaoCodigo | null {
  const t = normalizar(tipo)
  return PAR.find(([nome]) => nome === t)?.[1] ?? null
}

/** Tipo de Orientações (com acento) para um código de Iniciações; null se o código é desconhecido. */
export function tipoOrientacaoDeCodigo(codigo: unknown): string | null {
  const i = PAR.findIndex(([, cod]) => cod === codigo)
  return i >= 0 ? TIPOS_INICIACAO_ORIENTACAO[i] : null
}

/** A orientação é uma iniciação (IC, IT ou IE)? Esses tipos não contam em SO e DP4A (D-30). */
export function ehTipoIniciacao(tipo: unknown): boolean {
  return codigoDeTipoOrientacao(tipo) !== null
}

/** Opções do campo "Tipo de Orientação / Nível" em Orientações: níveis do programa e os três tipos de iniciação. */
export const OPCOES_TIPO_ORIENTACAO: Array<{ value: string; label: string }> = [
  'Mestrado',
  'Doutorado',
  'Pós-Doutorado',
  ...TIPOS_INICIACAO_ORIENTACAO,
  'TCC / Graduação',
].map((t) => ({ value: t, label: t }))
