import { createCrudService } from '@/services/crud'
import type { ProjetoPesquisa } from '@/types/database'

export const projetosPesquisaService = createCrudService<ProjetoPesquisa>({
  table: 'projetos_pesquisa',
  orderBy: 'titulo',
  ascending: true,
})
