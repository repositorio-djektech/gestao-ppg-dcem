import type { Role } from '@/types/database'

/**
 * Publicações que o docente vê (D-27): só as vinculadas a ele em `publicacoes_docentes`, o que
 * inclui as compartilhadas com coautores docentes. Sem cadastro vinculado, ou com os vínculos ainda
 * não carregados, não vê nenhuma. Restrição de interface (P-20).
 */
export function publicacoesVisiveisAoDocente<T extends { id: number }>(
  publicacoes: T[],
  docenteId: number | null | undefined,
  vinculos: Array<{ publicacao_id: number; docente_id: number }>,
): T[] {
  if (!docenteId) return []
  const eu = Number(docenteId)
  const meus = new Set(
    vinculos.filter((v) => Number(v.docente_id) === eu).map((v) => Number(v.publicacao_id)),
  )
  return publicacoes.filter((p) => meus.has(Number(p.id)))
}

/**
 * Docentes a vincular ao salvar: o docente logado entra sempre, para a publicação não sumir da
 * própria lista. A coordenação mantém exatamente a seleção feita.
 */
export function docentesParaVincularAoSalvar(
  role: Role | null | undefined,
  docenteIdLogado: number | null | undefined,
  selecionados: number[],
): number[] {
  if (role !== 'docente' || !docenteIdLogado) return selecionados
  const eu = Number(docenteIdLogado)
  return selecionados.some((id) => Number(id) === eu) ? selecionados : [...selecionados, eu]
}
