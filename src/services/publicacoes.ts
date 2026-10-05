import { createCrudService } from './crud'
import type { Publicacao } from '@/types/database'

export const publicacoesService = createCrudService<Publicacao>({
  table: 'publicacoes',
  orderBy: 'ano',
  ascending: false,
})
