import { createCrudService } from '@/services/crud'
import type { Banca } from '@/types/database'

export const bancasService = createCrudService<Banca>({
  table: 'bancas',
  orderBy: 'data',
  ascending: false,
})
