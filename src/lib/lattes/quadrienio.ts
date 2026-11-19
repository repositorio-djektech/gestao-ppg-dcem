/**
 * Recorte temporal de itens Lattes.
 *
 * - `ANO_INICIO`/`ANO_FIM`: período de avaliação CAPES padrão (hoje 2025–2028). Passa a ser
 *   configurável (D-32); estas constantes ficam como valor padrão e como reserva.
 * - `ANO_INICIO_IMPORTACAO`: o import do Lattes traz dados desde 2020, em todas as seções (D-31),
 *   porque há índices do departamento que usam anos anteriores ao período de avaliação. Os
 *   indicadores continuam calculando só o período de avaliação.
 */
export const ANO_INICIO = 2025
export const ANO_FIM = 2028
export const ANO_INICIO_IMPORTACAO = 2020

export interface JanelaAnos {
  anoInicio: number
  anoFim: number
}

/** Janela padrão do import: de `ANO_INICIO_IMPORTACAO` até o fim do período ou o ano atual (o que for maior). */
export function janelaImportacaoPadrao(hoje: Date = new Date()): JanelaAnos {
  return { anoInicio: ANO_INICIO_IMPORTACAO, anoFim: Math.max(ANO_FIM, hoje.getFullYear()) }
}

/**
 * Um intervalo [inicio, fim] cruza a janela? Fim ausente = em aberto (vale até hoje); início
 * ausente usa o fim. Sem nenhum dos dois, não cruza.
 */
export function intervaloCruzaJanela(
  inicio: number | null | undefined,
  fim: number | null | undefined,
  janela: JanelaAnos,
): boolean {
  const ini = inicio ?? fim ?? null
  if (ini === null) return false
  const f = fim ?? Number.POSITIVE_INFINITY
  return ini <= janela.anoFim && f >= janela.anoInicio
}

export interface ItemComAno {
  ano?: number | string | null
}

export interface ResultadoFiltroQuadrienio<T> {
  dentro: T[]
  ignorados: T[]
  totalOriginal: number
  totalDentro: number
  totalIgnorados: number
}

/**
 * Converte e valida se um valor pode ser tratado como ano numérico válido.
 */
export function extrairAnoNumerico(anoValor: unknown): number | null {
  if (anoValor === null || anoValor === undefined || anoValor === '') {
    return null
  }
  const num = typeof anoValor === 'number' ? anoValor : parseInt(String(anoValor).trim(), 10)
  if (Number.isNaN(num) || num <= 0) {
    return null
  }
  return num
}

/**
 * Verifica se um ano numérico está dentro do quadriênio especificado (padrão: período de avaliação).
 * Ano ausente ou inválido retorna false.
 */
export function estaNoQuadrienio(
  anoValor: unknown,
  inicio: number = ANO_INICIO,
  fim: number = ANO_FIM,
): boolean {
  const ano = extrairAnoNumerico(anoValor)
  if (ano === null) return false
  return ano >= inicio && ano <= fim
}

/**
 * Função pura de recorte temporal: dado uma lista de itens com ano,
 * filtra somente anos dentro do quadriênio CAPES (padrão: período de avaliação).
 * Ano ausente/inválido = excluído do recorte (contabilizado como ignorado).
 *
 * @param itens Lista de itens a filtrar
 * @param getAno Função opcional para obter o ano do item (padrão lê `item.ano`)
 * @param inicio Ano inicial do quadriênio (padrão ANO_INICIO=2025)
 * @param fim Ano final do quadriênio (padrão ANO_FIM=2028)
 */
export function filtrarPorQuadrienio<T>(
  itens: T[],
  getAno: (item: T) => unknown = (item) => (item as Record<string, unknown>).ano,
  inicio: number = ANO_INICIO,
  fim: number = ANO_FIM,
): ResultadoFiltroQuadrienio<T> {
  const dentro: T[] = []
  const ignorados: T[] = []

  for (const item of itens) {
    const ano = getAno(item)
    if (estaNoQuadrienio(ano, inicio, fim)) {
      dentro.push(item)
    } else {
      ignorados.push(item)
    }
  }

  return {
    dentro,
    ignorados,
    totalOriginal: itens.length,
    totalDentro: dentro.length,
    totalIgnorados: ignorados.length,
  }
}
