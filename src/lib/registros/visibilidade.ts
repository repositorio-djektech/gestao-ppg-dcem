/**
 * Registros que o docente vê quando a autoria vem de uma tabela de vínculo (patentes e produção
 * técnica, D-27): só os vinculados a ele. Registros sem vínculo (os anteriores à migração) não
 * aparecem para o docente até a coordenação vincular. Sem cadastro vinculado, ou com vínculos ainda
 * não carregados, não vê nenhum. Restrição de interface (P-20).
 */
export function registrosVisiveisAoDocente<T extends { id: number }>(
  registros: T[],
  docenteId: number | null | undefined,
  vinculos: Array<Record<string, any>>,
  chaveRegistro: string,
): T[] {
  if (!docenteId) return []
  const eu = Number(docenteId)
  const meus = new Set(
    vinculos.filter((v) => Number(v.docente_id) === eu).map((v) => Number(v[chaveRegistro])),
  )
  return registros.filter((r) => meus.has(Number(r.id)))
}
