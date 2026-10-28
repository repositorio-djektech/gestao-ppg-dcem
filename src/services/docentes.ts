import { supabase } from '@/lib/supabase/client'
import { createCrudService } from '@/services/crud'
import type { Docente } from '@/types/database'

const baseDocentesService = createCrudService<Docente>({
  table: 'docentes',
  orderBy: 'nome',
  ascending: true,
})

export interface ResultadoExclusaoDocenteCascade {
  sucesso: boolean
  mensagem: string
  teve_usuario_vinculado?: boolean
}

export const docentesService = {
  ...baseDocentesService,
  /**
   * Exclui um docente em cascata via Edge Function `admin-usuarios`:
   * - Exclui o docente de public.docentes
   * - Se houver profile e usuário em auth.users vinculados, exclui o usuário do auth e o profile em cascata
   * - Se não houver usuário/perfil vinculado, remove apenas a linha de docentes
   */
  async excluirDocenteEmCascata(
    docenteId: number | string,
  ): Promise<ResultadoExclusaoDocenteCascade> {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        acao: 'excluir-docente',
        docenteId: Number(docenteId),
      },
    })

    if (error) {
      console.error('Erro ao invocar edge function admin-usuarios (excluir-docente):', error)
      throw new Error(
        error.message || 'Falha na comunicação com o servidor para excluir o docente em cascata.',
      )
    }

    if (!data?.sucesso) {
      throw new Error(data?.mensagem || 'Falha ao excluir docente.')
    }

    return data
  },
}
