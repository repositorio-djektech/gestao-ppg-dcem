/**
 * Atribuição da publicação a um só docente (IN 02/2026, art. 8º, §7º; P-34): com dois ou mais
 * docentes do programa como autores, o docente indica a quem a publicação é atribuída no PDQ.
 * A indicação só vale enquanto o escolhido continua entre os docentes autores.
 */
export function precisaAtribuicao(docentesAutoresIds: number[]): boolean {
  return new Set(docentesAutoresIds.map(Number)).size >= 2
}

/** Docente atribuído que vale: null se há menos de 2 autores docentes ou se o escolhido saiu da lista. */
export function docenteAtribuidoValido(
  atribuidoId: number | string | null | undefined,
  docentesAutoresIds: number[],
): number | null {
  if (!precisaAtribuicao(docentesAutoresIds)) return null
  if (atribuidoId === null || atribuidoId === undefined || atribuidoId === '') return null
  const id = Number(atribuidoId)
  return docentesAutoresIds.map(Number).includes(id) ? id : null
}
