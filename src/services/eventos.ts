import { createCrudService } from '@/services/crud'
import type { Evento } from '@/types/database'

export const eventosService = createCrudService<Evento>({
  table: 'eventos',
  orderBy: 'created_at',
  ascending: false,
})
