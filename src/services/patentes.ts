import { createCrudService } from '@/services/crud'
import type { Patente } from '@/types/database'

export const patentesService = createCrudService<Patente>('patentes', 'created_at')
