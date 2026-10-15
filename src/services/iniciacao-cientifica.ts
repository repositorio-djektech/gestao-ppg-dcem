import { createCrudService } from '@/services/crud'
import type { IniciacaoCientifica } from '@/types/database'

export const iniciacaoCientificaService = createCrudService<IniciacaoCientifica>({
  table: 'iniciacao_cientifica',
  orderBy: 'ano',
  ascending: false,
})
