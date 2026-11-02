import type { Disciplina } from '@/types/database'

export interface VinculoDisciplinaDocente {
  disciplina_id: number
  docente_id: number
}

/**
 * Ids dos docentes de uma disciplina: vínculos N:N (`docentes_ids`) somados ao
 * `docente_id` legado, sem repetição.
 */
export function idsDocentesDaDisciplina(
  d: Pick<Disciplina, 'docente_id' | 'docentes_ids'>,
): number[] {
  const ids = new Set<number>()
  for (const id of d.docentes_ids ?? []) {
    const n = Number(id)
    if (n) ids.add(n)
  }
  if (d.docente_id) ids.add(Number(d.docente_id))
  return [...ids]
}

/**
 * Anexa `docentes_ids` (tabela `disciplinas_docentes`) a cada disciplina lida
 * diretamente da tabela `disciplinas`.
 */
export function anexarDocentesNasDisciplinas<T extends Pick<Disciplina, 'id'>>(
  disciplinas: T[],
  vinculos: VinculoDisciplinaDocente[],
): Array<T & { docentes_ids: number[] }> {
  const mapa = new Map<number, number[]>()
  for (const v of vinculos) {
    const discId = Number(v.disciplina_id)
    const lista = mapa.get(discId) ?? []
    lista.push(Number(v.docente_id))
    mapa.set(discId, lista)
  }
  return disciplinas.map((d) => ({ ...d, docentes_ids: mapa.get(Number(d.id)) ?? [] }))
}
