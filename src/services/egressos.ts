import { createCrudService } from '@/services/crud'
import type { Egresso } from '@/types/database'

export const egressosService = createCrudService<Egresso>({
  table: 'egressos',
  orderBy: 'nome',
  ascending: true,
})
