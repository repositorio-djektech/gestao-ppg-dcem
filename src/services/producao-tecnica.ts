import { createCrudService } from '@/services/crud'
import type { ProducaoTecnica } from '@/types/database'

export const producaoTecnicaService = createCrudService<ProducaoTecnica>({
  table: 'producao_tecnica',
  orderBy: 'ano',
  ascending: false,
})
