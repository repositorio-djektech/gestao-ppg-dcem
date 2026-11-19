/**
 * Exibição da tabela de Orientações e visão restrita do docente (D-27).
 */
import { exibirMesAno } from '@/lib/datas/mes-ano'

function normalizar(texto: string | null | undefined): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Cor do badge do tipo. Mestrado e Doutorado têm cores próprias; os demais ficam em tons neutros. */
export function classeBadgeTipoOrientacao(tipo: string | null | undefined): string {
  switch (normalizar(tipo)) {
    case 'mestrado':
      return 'bg-blue-50 text-blue-700'
    case 'doutorado':
      return 'bg-purple-50 text-purple-700'
    case 'pos-doutorado':
      return 'bg-indigo-50 text-indigo-700'
    case 'iniciacao cientifica':
      return 'bg-amber-50 text-amber-700'
    case 'iniciacao tecnologica':
      return 'bg-orange-50 text-orange-700'
    case 'iniciacao em extensao':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

/** Início/término para a tabela (D-29): MM/AAAA, de qualquer formato antigo; vazio vira null (traço). */
export function formatarDataOrientacao(valor: string | null | undefined): string | null {
  return exibirMesAno(valor)
}

/** Sem início e sem término: Início, Término e Status mostram o traço. */
export function semDatasDefinidas(o: { inicio?: string | null; fim?: string | null }): boolean {
  return formatarDataOrientacao(o.inicio) === null && formatarDataOrientacao(o.fim) === null
}

/**
 * Orientações que o docente vê: só as próprias, principais e coorientações (`docente_id` dele).
 * Docente sem cadastro vinculado não vê nenhuma. Restrição de interface (P-20).
 */
export function filtrarOrientacoesDoDocente<T extends { docente_id?: number | null }>(
  orientacoes: T[],
  docenteId: number | null | undefined,
): T[] {
  if (!docenteId) return []
  return orientacoes.filter((o) => Number(o.docente_id) === Number(docenteId))
}
