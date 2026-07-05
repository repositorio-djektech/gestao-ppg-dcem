import { createCrudService } from '@/services/crud'
import type { Disciplina } from '@/types/database'

export const disciplinasService = createCrudService<Disciplina>({
  table: 'disciplinas',
  orderBy: 'nome',
  ascending: true,
})
