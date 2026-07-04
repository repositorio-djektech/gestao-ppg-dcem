import { createCrudService } from './crud'
import type { Publicacao } from '@/types/database'

export const publicacoesService = createCrudService<Publicacao>('publicacoes', 'ano')
