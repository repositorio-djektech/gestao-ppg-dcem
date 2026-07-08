import { createCrudService } from '@/services/crud'
import type { Patente } from '@/types/database'

export const patentesService = createCrudService<Patente>({
  table: 'patentes',
  orderBy: 'created_at',
  ascending: false,
})
