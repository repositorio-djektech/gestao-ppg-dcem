/**
 * Recorte temporal de itens Lattes para o quadriênio CAPES mais recente.
 */
export const ANO_INICIO = 2025
export const ANO_FIM = 2028

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
 * Verifica se um ano numérico está dentro do quadriênio especificado (padrão 2022–2025).
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
 * filtra somente anos dentro do quadriênio CAPES (padrão 2022–2025).
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
