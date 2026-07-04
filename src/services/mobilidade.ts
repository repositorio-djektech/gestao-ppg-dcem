import { createCrudService } from './crud'
import type { Mobilidade } from '@/types/database'

export const mobilidadeService = createCrudService<Mobilidade>('mobilidade_docente', 'nome')
