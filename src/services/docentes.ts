import { createCrudService } from './crud'
import type { Docente } from '@/types/database'

export const docentesService = createCrudService<Docente>('docentes', 'nome')
