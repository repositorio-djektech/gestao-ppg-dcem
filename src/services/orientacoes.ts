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

export const orientacoesService = {
  ...baseOrientacoesService,
  async list(): Promise<Orientacao[]> {
    const list = await baseOrientacoesService.list()
    return list.map(anexarStatusEfetivo)
  },
  async getById(id: number | string): Promise<Orientacao | null> {
    const item = await baseOrientacoesService.getById(id)
    return item ? anexarStatusEfetivo(item) : null
  },
}
