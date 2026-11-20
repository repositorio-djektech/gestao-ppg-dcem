/**
 * Ordem alfabética em português (P-35): ignora acento e maiúscula/minúscula ("Álvaro" fica entre
 * "Ana" e "Bruno", não depois do "Z" como na ordenação padrão do banco).
 */
const COLETOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export function compararNomes(a: unknown, b: unknown): number {
  return COLETOR.compare(String(a ?? '').trim(), String(b ?? '').trim())
}

/** Cópia da lista em ordem alfabética pelo campo `nome`. */
export function ordenarPorNome<T extends { nome?: string | null }>(itens: T[]): T[] {
  return [...itens].sort((x, y) => compararNomes(x.nome, y.nome))
}
