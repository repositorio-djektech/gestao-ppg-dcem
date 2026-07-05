import { createCrudService } from '@/services/crud'
import type { Discente } from '@/types/database'

export const discentesService = createCrudService<Discente>({
  table: 'discentes',
  orderBy: 'nome',
  ascending: true,
})
