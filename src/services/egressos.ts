import { createCrudService } from '@/services/crud'
import type { Egresso } from '@/types/database'
import { supabase } from '@/lib/supabase/client'

export const egressosService = createCrudService<Egresso>({
  table: 'egressos',
  orderBy: 'nome',
  ascending: true,
})

/**
 * Cria os egressos que faltam a partir das orientações de mestrado e doutorado já concluídas (D-35).
 * Cobre quem concluiu pela simples passagem do mês do término. Melhor esforço: falha não impede
 * abrir a tela. Só cria; nunca altera nem apaga egresso.
 */
export async function sincronizarEgressosDeOrientacoes(client: typeof supabase = supabase) {
  try {
    const { error } = await (client as any).rpc('sincronizar_egressos_orientacoes')
    if (error) console.warn('Não foi possível sincronizar os egressos:', error.message)
  } catch (err) {
    console.warn('Não foi possível sincronizar os egressos:', err)
  }
}

/** Serviço da tela Egressos: sincroniza com as orientações concluídas antes de listar. */
export const egressosComSincronizacao = {
  ...egressosService,
  list: async () => {
    await sincronizarEgressosDeOrientacoes()
    return egressosService.list()
  },
}
