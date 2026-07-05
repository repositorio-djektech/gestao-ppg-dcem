import { createCrudService } from '@/services/crud'
import type { Docente } from '@/types/database'

export const docentesService = createCrudService<Docente>({
  table: 'docentes',
  orderBy: 'nome',
  ascending: true,
})
