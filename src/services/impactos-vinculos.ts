import { supabase } from '@/lib/supabase/client'
import type { ImpactoVinculo, ImpactoVinculoEntidade, ImpactoSocial } from '@/types/database'

const tableRef = () => (supabase.from as any)('impactos_vinculos')

export interface ImpactoComVinculos extends ImpactoSocial {
  vinculos?: ImpactoVinculo[]
}

export const impactosVinculosService = {
  /**
   * Lista todos os vínculos cadastrados
   */
  async listarTodos(): Promise<ImpactoVinculo[]> {
    const { data, error } = await tableRef().select('*').order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao listar todos impactos_vinculos:', error)
      return []
    }
    return (data || []) as ImpactoVinculo[]
  },

  /**
   * Lista os vínculos de uma entidade específica (ex: 'producao_tecnica', 'patentes', 'premiacoes')
   */
  async listarPorEntidade(entidade: ImpactoVinculoEntidade): Promise<ImpactoVinculo[]> {
    const { data, error } = await tableRef()
      .select('*')
      .eq('entidade', entidade)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`Erro ao listar impactos_vinculos para entidade ${entidade}:`, error)
      return []
    }
    return (data || []) as ImpactoVinculo[]
  },

  /**
   * Lista os vínculos de um registro específico de uma entidade
   */
  async listarPorRegistro(
    entidade: ImpactoVinculoEntidade,
    entidadeId: number,
  ): Promise<ImpactoVinculo[]> {
    const { data, error } = await tableRef()
      .select('*')
      .eq('entidade', entidade)
      .eq('entidade_id', Number(entidadeId))

    if (error) {
      console.error(
        `Erro ao listar impactos_vinculos para entidade ${entidade} id ${entidadeId}:`,
        error,
      )
      return []
    }
    return (data || []) as ImpactoVinculo[]
  },

  /**
   * Lista todos os registros de qualquer entidade vinculados a um impacto_social_id
   */
  async listarPorImpacto(impactoSocialId: number): Promise<ImpactoVinculo[]> {
    const { data, error } = await tableRef()
      .select('*')
      .eq('impacto_social_id', Number(impactoSocialId))
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`Erro ao listar vínculos do impacto ${impactoSocialId}:`, error)
      return []
    }
    return (data || []) as ImpactoVinculo[]
  },

  /**
   * Sincroniza os vínculos de um registro de uma entidade com uma lista de IDs de impactos sociais.
   * Remove vínculos que não constam na lista e insere os novos.
   * Não afeta a tabela impacto_social nem outros registros.
   */
  async sincronizarVinculosRegistro(
    entidade: ImpactoVinculoEntidade,
    entidadeId: number,
    novosImpactosIds: number[],
  ): Promise<void> {
    const idNum = Number(entidadeId)
    if (!idNum) return

    const { data: existentes, error: buscaErr } = await tableRef()
      .select('id, impacto_social_id')
      .eq('entidade', entidade)
      .eq('entidade_id', idNum)

    if (buscaErr) {
      console.error('Erro ao consultar vínculos existentes:', buscaErr)
      throw buscaErr
    }

    const idsAtuais = new Set(
      (existentes || []).map((r: { impacto_social_id: number }) => Number(r.impacto_social_id)),
    )
    const idsDesejados = new Set(novosImpactosIds.map((id) => Number(id)).filter(Boolean))

    // IDs para remover
    const idsParaRemover: number[] = []
    for (const r of existentes || []) {
      if (!idsDesejados.has(Number(r.impacto_social_id))) {
        idsParaRemover.push(Number(r.id))
      }
    }

    // IDs para adicionar
    const idsParaAdicionar: number[] = []
    for (const dId of idsDesejados) {
      if (!idsAtuais.has(dId)) {
        idsParaAdicionar.push(dId)
      }
    }

    // Executa remoções
    if (idsParaRemover.length > 0) {
      const { error: delErr } = await tableRef().delete().in('id', idsParaRemover)
      if (delErr) {
        console.error('Erro ao remover vínculos obsoletos:', delErr)
        throw delErr
      }
    }

    // Executa inserções
    if (idsParaAdicionar.length > 0) {
      const rows = idsParaAdicionar.map((impactoId) => ({
        impacto_social_id: impactoId,
        entidade,
        entidade_id: idNum,
      }))
      const { error: insErr } = await tableRef().insert(rows)
      if (insErr) {
        console.error('Erro ao inserir novos vínculos de impacto:', insErr)
        throw insErr
      }
    }
  },

  /**
   * Remove um vínculo específico pelo ID
   */
  async removerVinculo(id: number): Promise<void> {
    const { error } = await tableRef().delete().eq('id', Number(id))
    if (error) {
      console.error('Erro ao remover vínculo de impacto:', error)
      throw error
    }
  },
}
