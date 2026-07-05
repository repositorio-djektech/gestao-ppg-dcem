import { createCrudService } from '@/services/crud'
import type { Orientacao } from '@/types/database'

export const orientacoesService = createCrudService<Orientacao>({
  table: 'orientacoes',
  orderBy: 'inicio',
  ascending: false,
})
