import { createCrudService } from '@/services/crud'
import type { Orientacao } from '@/types/database'
import { calcularStatusEfetivoOrientacao } from '@/lib/orientacoes/status'

const baseOrientacoesService = createCrudService<Orientacao>({
  table: 'orientacoes',
  orderBy: 'inicio',
  ascending: false,
})

function anexarStatusEfetivo(ori: Orientacao): Orientacao {
  if (!ori) return ori
  const statusEfetivo = calcularStatusEfetivoOrientacao(ori)
  return {
    ...ori,
    status_efetivo: statusEfetivo,
    cancelado: ori.cancelado === true || ori.status === 'cancelado',
  }
}

/**
 * `status_efetivo` é derivado só no front (anexarStatusEfetivo) e não existe como coluna em
 * `orientacoes`. O PostgREST rejeita colunas desconhecidas (PGRST204), então ele nunca pode ir
 * no corpo de um INSERT/UPDATE. O `status` real é derivado pelo trigger trg_orientacoes_derivar_status.
 */
export function removerCamposDerivados<T extends Partial<Orientacao>>(item: T): T {
  const { status_efetivo: _derivado, ...resto } = item
  return resto as T
}

export const orientacoesService = {
  ...baseOrientacoesService,
  async create(item: Partial<Orientacao>): Promise<Orientacao> {
    return baseOrientacoesService.create(removerCamposDerivados(item))
  },
  async update(id: number | string, item: Partial<Orientacao>): Promise<Orientacao> {
    return baseOrientacoesService.update(id, removerCamposDerivados(item))
  },
  async list(): Promise<Orientacao[]> {
    const list = await baseOrientacoesService.list()
    return list.map(anexarStatusEfetivo)
  },
  async getById(id: number | string): Promise<Orientacao | null> {
    const item = await baseOrientacoesService.getById(id)
    return item ? anexarStatusEfetivo(item) : null
  },
}
