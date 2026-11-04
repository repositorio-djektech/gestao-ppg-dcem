import type { Role } from '@/types/database'
import type { RelatorioReconducaoResposta } from './types'

/**
 * Credenciamento: o docente vê os cards gerais (`resumo`) mas só o próprio nome na lista
 * (`avaliacoes`). Os demais papéis recebem o relatório sem alteração (D-25). Docente sem cadastro
 * vinculado, ou papel ainda não carregado, recebe a lista vazia (nunca a lista inteira por engano).
 * Restrição de interface; a RLS continua aberta (P-20).
 */
export function restringirRelatorioReconducaoAoDocente(
  relatorio: RelatorioReconducaoResposta,
  role: Role | null | undefined,
  docenteId: number | null | undefined,
): RelatorioReconducaoResposta {
  if (role && role !== 'docente') return relatorio
  const proprio = role === 'docente' && docenteId ? Number(docenteId) : null
  return {
    ...relatorio,
    avaliacoes:
      proprio === null ? [] : relatorio.avaliacoes.filter((a) => Number(a.docente_id) === proprio),
  }
}
