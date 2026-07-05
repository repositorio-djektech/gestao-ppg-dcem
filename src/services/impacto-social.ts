import { createCrudService } from '@/services/crud'
import type { ImpactoSocial } from '@/types/database'

export const impactoSocialService = createCrudService<ImpactoSocial>({
  table: 'impacto_social',
  orderBy: 'ano',
  ascending: false,
})
