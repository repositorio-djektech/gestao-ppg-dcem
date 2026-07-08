import { createCrudService } from '@/services/crud'
import type { Mobilidade } from '@/types/database'

export const mobilidadeService = createCrudService<Mobilidade>({
  table: 'mobilidade_docente',
  orderBy: 'periodo',
  ascending: false,
})
