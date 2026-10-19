import { createCrudService } from './crud'
import { Qualis } from '@/types/database'

export const qualisService = createCrudService<Qualis>({
  table: 'qualis',
  select: '*',
  orderBy: 'id',
  ascending: true,
})
