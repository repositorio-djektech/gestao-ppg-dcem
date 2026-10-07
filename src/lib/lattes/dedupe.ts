/**
 * Normaliza título/texto para chave de deduplicação:
 * - converte para lowercase
 * - remove acentos (decomposição NFD)
 * - remove pontuação (mantém apenas a-z, 0-9 e espaços)
 * - colapsa múltiplos espaços em branco para um único espaço
 * - remove espaços no início e no fim
 */
export function normalizarTitulo(titulo: string | null | undefined): string {
  if (!titulo) return ''
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Gera a chave única de deduplicação no formato:
 * normalizar(título) + '_' + ano
 */
export function gerarChaveDedupe(
  titulo: string | null | undefined,
  ano: number | string | null | undefined,
): string {
  const titNormalizado = normalizarTitulo(titulo)
  const anoStr = ano !== null && ano !== undefined ? String(ano).trim() : 'sem_ano'
  return `${titNormalizado}_${anoStr}`
}

export interface ItemComTituloEAno {
  titulo?: string | null
  nome?: string | null
  ano?: number | string | null
}

export interface ResultadoDedupe<T> {
  unicos: T[]
  duplicatasDescartadas: T[]
  totalOriginal: number
  totalUnicos: number
  totalDuplicatas: number
}

/**
 * Função pura de deduplicação:
 * Chave = normalizar(título) + '_' + ano.
 * Mantém a primeira ocorrência, descarta as subsequentes,
 * e retorna tanto os únicos quanto a contagem de duplicatas descartadas.
 *
 * @param itens Lista de itens a deduplicar
 * @param getTitulo Função opcional para extrair o título (padrão busca `item.titulo` ou `item.nome`)
 * @param getAno Função opcional para extrair o ano (padrão busca `item.ano`)
 */
export function deduplicarItens<T>(
  itens: T[],
  getTitulo: (item: T) => string | null | undefined = (item) => {
    const rec = item as Record<string, unknown>
    return (rec.titulo ?? rec.nome ?? '') as string
  },
  getAno: (item: T) => number | string | null | undefined = (item) => {
    const rec = item as Record<string, unknown>
    return (rec.ano ?? '') as number | string
  },
): ResultadoDedupe<T> {
  const vistos = new Set<string>()
  const unicos: T[] = []
  const duplicatasDescartadas: T[] = []

  for (const item of itens) {
    const titulo = getTitulo(item)
    const ano = getAno(item)
    const chave = gerarChaveDedupe(titulo, ano)

    if (vistos.has(chave)) {
      duplicatasDescartadas.push(item)
    } else {
      vistos.add(chave)
      unicos.push(item)
    }
  }

  return {
    unicos,
    duplicatasDescartadas,
    totalOriginal: itens.length,
    totalUnicos: unicos.length,
    totalDuplicatas: duplicatasDescartadas.length,
  }
}
