import { createCrudService } from './crud'
import type { Patente } from '@/types/database'

export const patentesService = createCrudService<Patente>('patentes', 'titulo')
