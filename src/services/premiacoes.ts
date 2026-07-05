import { createCrudService } from '@/services/crud'
import type { Premicao } from '@/types/database'

export const premiacoesService = createCrudService<Premicao>({
  table: 'premiacoes',
  orderBy: 'ano',
  ascending: false,
})
