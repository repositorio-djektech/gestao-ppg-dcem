import { createCrudService } from './crud'
import type { Evento } from '@/types/database'

export const eventosService = createCrudService<Evento>('eventos', 'evento')
