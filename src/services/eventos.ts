import { createCrudService } from '@/services/crud'
import type { Evento } from '@/types/database'

export const eventosService = createCrudService<Evento>('eventos', 'created_at')
