import { createCrudService } from './crud'
import { Qualis } from '@/types/database'
import { supabase } from '@/lib/supabase/client'

const crud = createCrudService<Qualis>({
  table: 'qualis',
  select: '*',
  orderBy: 'id',
  ascending: true,
})

export const ESTRATOS_PADRAO_FALLBACK: string[] = [
  'A1',
  'A2',
  'A3',
  'A4',
  'B1',
  'B2',
  'B3',
  'B4',
  'C',
]

export interface ResumoQualisPublicacoes {
  totalEstratos: number
  publicacoesClassificadas: number
  publicacoesSemEstrato: number
  contagemPorEstrato: Record<string, number>
}

export const qualisService = {
  ...crud,

  /**
   * Retorna os estratos cadastrados no catálogo ordenados por código.
   * Se a tabela estiver vazia, retorna os estratos padrão como fallback.
   */
  async listarEstratosCodigos(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('qualis')
        .select('estrato')
        .order('estrato', { ascending: true })

      if (error || !data || data.length === 0) {
        return ESTRATOS_PADRAO_FALLBACK
      }

      const lista = data.map((item) => item.estrato).filter(Boolean)
      return lista.length > 0 ? Array.from(new Set(lista)) : ESTRATOS_PADRAO_FALLBACK
    } catch {
      return ESTRATOS_PADRAO_FALLBACK
    }
  },

  /**
   * Busca todas as contagens de publicações de uma vez com um único select:
   * contagem por estrato, total classificadas e sem estrato.
   */
  async obterResumoEContagens(): Promise<ResumoQualisPublicacoes> {
    const { data: estratosCadastrados } = await supabase.from('qualis').select('id, estrato')

    const totalEstratos = estratosCadastrados?.length || 0

    // Busca apenas estrato_qualis de todas as publicações em lote
    const { data: pubs, error } = await supabase.from('publicacoes').select('estrato_qualis')

    if (error || !pubs) {
      return {
        totalEstratos,
        publicacoesClassificadas: 0,
        publicacoesSemEstrato: 0,
        contagemPorEstrato: {},
      }
    }

    let publicacoesClassificadas = 0
    let publicacoesSemEstrato = 0
    const contagemPorEstrato: Record<string, number> = {}

    for (const p of pubs) {
      if (p.estrato_qualis && p.estrato_qualis.trim() !== '') {
        publicacoesClassificadas++
        const cod = p.estrato_qualis.trim()
        contagemPorEstrato[cod] = (contagemPorEstrato[cod] || 0) + 1
      } else {
        publicacoesSemEstrato++
      }
    }

    return {
      totalEstratos,
      publicacoesClassificadas,
      publicacoesSemEstrato,
      contagemPorEstrato,
    }
  },

  /**
   * Conta quantas publicações usam determinado código de estrato.
   */
  async contarPublicacoesPorEstrato(estratoCodigo: string): Promise<number> {
    if (!estratoCodigo) return 0
    const { count, error } = await supabase
      .from('publicacoes')
      .select('*', { count: 'exact', head: true })
      .eq('estrato_qualis', estratoCodigo)

    if (error) {
      console.warn('Erro ao contar publicações por estrato:', error)
      return 0
    }
    return count || 0
  },

  /**
   * Propagação na edição do código do estrato:
   * Se o código mudou (estratoAntigo != estratoNovo), atualiza todas as publicações que
   * usavam o código antigo em um único lote.
   */
  async propagarAlteracaoEstrato(
    estratoAntigo: string,
    estratoNovo: string,
  ): Promise<{ alteradas: number }> {
    if (!estratoAntigo || !estratoNovo || estratoAntigo === estratoNovo) {
      return { alteradas: 0 }
    }

    const { data, error } = await supabase
      .from('publicacoes')
      .update({ estrato_qualis: estratoNovo })
      .eq('estrato_qualis', estratoAntigo)
      .select('id')

    if (error) {
      console.error('Erro ao propagar alteração de estrato em publicações:', error)
      throw new Error(`Falha ao propagar alteração nas publicações: ${error.message}`)
    }

    return { alteradas: data?.length || 0 }
  },

  /**
   * Exclusão com propagação:
   * 1. Zera (null) estrato_qualis das publicações com aquele código
   * 2. Remove o registro do catálogo qualis
   */
  async excluirComPropagacao(
    id: number | string,
    estratoCodigo: string,
  ): Promise<{ publicacoesDesvinculadas: number }> {
    let desvinculadas = 0

    if (estratoCodigo) {
      const { data, error: errPubs } = await supabase
        .from('publicacoes')
        .update({ estrato_qualis: null })
        .eq('estrato_qualis', estratoCodigo)
        .select('id')

      if (errPubs) {
        console.error('Erro ao desvincular publicações do estrato excluído:', errPubs)
        throw new Error(`Falha ao desvincular publicações: ${errPubs.message}`)
      }
      desvinculadas = data?.length || 0
    }

    // Exclui o estrato no catálogo
    const numericId = typeof id === 'number' ? id : Number(id)
    const { error: errQualis } = await supabase.from('qualis').delete().eq('id', numericId)
    if (errQualis) {
      console.error('Erro ao excluir estrato:', errQualis)
      throw new Error(`Falha ao excluir estrato: ${errQualis.message}`)
    }

    return { publicacoesDesvinculadas: desvinculadas }
  },
}
