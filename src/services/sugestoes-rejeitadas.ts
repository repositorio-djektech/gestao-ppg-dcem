import { supabase } from '@/lib/supabase/client'

export type TipoSugestaoVinculo =
  | 'publicacao_docente'
  | 'publicacao_coautor'
  | 'discente_orientador'

export interface SugestaoRejeitadaItem {
  id?: number
  tipo_vinculo: TipoSugestaoVinculo
  origem_identificador: string
  alvo_identificador: string
  motivo?: string | null
  rejeitado_por?: string | null
  created_at?: string
}

export const sugestoesRejeitadasService = {
  /**
   * Lista todas as rejeições salvas para cache rápido na importação/revisão.
   */
  async listarTodas(client: any = supabase): Promise<SugestaoRejeitadaItem[]> {
    try {
      const { data, error } = await client.from('sugestoes_vinculos_rejeitadas').select('*')

      if (error) {
        console.warn('Erro ao consultar sugestoes_vinculos_rejeitadas:', error)
        return []
      }
      return (data || []) as SugestaoRejeitadaItem[]
    } catch {
      return []
    }
  },

  /**
   * Registra a rejeição de uma sugestão de vínculo para que nunca mais seja sugerida / gravada automaticamente.
   */
  async rejeitarSugestao(
    params: {
      tipoVinculo: TipoSugestaoVinculo
      origemIdentificador: string
      alvoIdentificador: string
      motivo?: string
      rejeitadoPor?: string
    },
    client: any = supabase,
  ): Promise<boolean> {
    try {
      const { error } = await client.from('sugestoes_vinculos_rejeitadas').insert({
        tipo_vinculo: params.tipoVinculo,
        origem_identificador: String(params.origemIdentificador).trim(),
        alvo_identificador: String(params.alvoIdentificador).trim(),
        motivo: params.motivo || 'Rejeitado pelo usuário',
        rejeitado_por: params.rejeitadoPor || 'Usuário',
      })

      if (error && error.code !== '23505') {
        // 23505 = unique violation, já estava rejeitado
        console.error('Erro ao salvar rejeição de sugestão:', error)
        return false
      }
      return true
    } catch (e) {
      console.error('Erro ao rejeitar sugestão:', e)
      return false
    }
  },

  /**
   * Remove uma rejeição anterior se o usuário quiser reabilitar a sugestão.
   */
  async removerRejeicao(
    params: {
      tipoVinculo: TipoSugestaoVinculo
      origemIdentificador: string
      alvoIdentificador: string
    },
    client: any = supabase,
  ): Promise<boolean> {
    try {
      const { error } = await client
        .from('sugestoes_vinculos_rejeitadas')
        .delete()
        .eq('tipo_vinculo', params.tipoVinculo)
        .eq('origem_identificador', String(params.origemIdentificador).trim())
        .eq('alvo_identificador', String(params.alvoIdentificador).trim())

      if (error) {
        console.error('Erro ao remover rejeição de sugestão:', error)
        return false
      }
      return true
    } catch {
      return false
    }
  },
}
