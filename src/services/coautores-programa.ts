import { supabase } from '@/lib/supabase/client'
import type { PublicacaoCoautorPrograma, PublicacaoCoautorProgramaTipo } from '@/types/database'

export interface VincularCoautorParams {
  publicacaoId: number
  discenteId?: number | null
  egressoId?: number | null
  tipo: PublicacaoCoautorProgramaTipo
  nomeCitado: string
  grauConfianca?: number
  confirmadoPor?: string
}

const tableRef = () => (supabase.from as any)('publicacoes_coautores_programa')

export const coautoresProgramaService = {
  async listarPorPublicacao(publicacaoId: number): Promise<PublicacaoCoautorPrograma[]> {
    const { data, error } = await tableRef()
      .select('*')
      .eq('publicacao_id', publicacaoId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar coautores do programa para a publicação:', error)
      return []
    }
    return (data || []) as unknown as PublicacaoCoautorPrograma[]
  },

  async listarTodos(): Promise<PublicacaoCoautorPrograma[]> {
    const { data, error } = await tableRef().select('*').order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao listar todos coautores do programa:', error)
      return []
    }
    return (data || []) as unknown as PublicacaoCoautorPrograma[]
  },

  async confirmarCoautor(params: VincularCoautorParams): Promise<PublicacaoCoautorPrograma | null> {
    // Se for 'sem_coautoria', remove quaisquer outros vínculos da publicação primeiro
    if (params.tipo === 'sem_coautoria') {
      await tableRef().delete().eq('publicacao_id', params.publicacaoId)
    } else {
      // Se estamos adicionando orientando/egresso, remove eventual 'sem_coautoria' anterior
      await tableRef().delete().eq('publicacao_id', params.publicacaoId).eq('tipo', 'sem_coautoria')
    }

    const { data, error } = await tableRef()
      .insert({
        publicacao_id: params.publicacaoId,
        discente_id: params.discenteId || null,
        egresso_id: params.egressoId || null,
        tipo: params.tipo,
        nome_citado: params.nomeCitado,
        grau_confianca: params.grauConfianca ?? 1.0,
        confirmado_por: params.confirmadoPor || 'Usuário',
        confirmado_em: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao registrar confirmação de coautor:', error)
      throw error
    }
    return data as unknown as PublicacaoCoautorPrograma
  },

  async removerConfirmacao(id: number): Promise<void> {
    const { error } = await tableRef().delete().eq('id', id)

    if (error) {
      console.error('Erro ao remover vínculo de coautor:', error)
      throw error
    }
  },

  async marcarSemCoautoria(publicacaoId: number, confirmadoPor?: string): Promise<void> {
    // Remove vínculos existentes
    await tableRef().delete().eq('publicacao_id', publicacaoId)

    const { error } = await tableRef().insert({
      publicacao_id: publicacaoId,
      tipo: 'sem_coautoria',
      nome_citado: 'Sem coautoria de orientando/egresso do programa',
      grau_confianca: 1.0,
      confirmado_por: confirmadoPor || 'Usuário',
      confirmado_em: new Date().toISOString(),
    })

    if (error) {
      console.error('Erro ao marcar sem coautoria:', error)
      throw error
    }
  },
}
