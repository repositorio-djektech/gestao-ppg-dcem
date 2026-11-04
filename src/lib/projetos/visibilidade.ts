/**
 * Projetos que o docente vê (D-27): os que coordena e os em que participa. Edita e apaga só os que
 * coordena (ver `podeEditarRegistro`). Docente sem cadastro vinculado não vê nenhum.
 * Restrição de interface (P-20).
 */
export function projetosVisiveisAoDocente<T extends { id: number; coordenador_id?: number | null }>(
  projetos: T[],
  docenteId: number | null | undefined,
  participacoes: Array<{ projeto_id: number; docente_id: number }>,
): T[] {
  if (!docenteId) return []
  const eu = Number(docenteId)
  const idsOndeParticipo = new Set(
    participacoes.filter((p) => Number(p.docente_id) === eu).map((p) => Number(p.projeto_id)),
  )
  return projetos.filter(
    (p) => Number(p.coordenador_id) === eu || idsOndeParticipo.has(Number(p.id)),
  )
}
