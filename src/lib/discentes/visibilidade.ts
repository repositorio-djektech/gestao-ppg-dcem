import { discenteSemOrientador } from '@/services/permissoes'

/**
 * Discentes que o docente pode ver (visão restrita do docente, D-25):
 * - os que ele orienta (orientador principal);
 * - os que ele coorienta (tem orientação com o discente, ver `orientacoes`);
 * - os sem orientador, só para poder assumir a orientação (H-01).
 * Docente sem cadastro vinculado não vê nada. Restrição de interface: não substitui a RLS (P-20).
 */
export function discentesVisiveisAoDocente<
  T extends { id: number; docente_orientador_id?: number | null },
>(
  discentes: T[],
  docenteId: number | null | undefined,
  idsComOrientacaoDoDocente: Iterable<number>,
): T[] {
  if (!docenteId) return []
  const coorientados = new Set(idsComOrientacaoDoDocente)
  return discentes.filter(
    (d) =>
      Number(d.docente_orientador_id) === Number(docenteId) ||
      coorientados.has(d.id) ||
      discenteSemOrientador(d),
  )
}
