import { supabase } from '@/lib/supabase/client'
import type { PublicacaoDocente, Docente } from '@/types/database'

export const publicacoesDocentesService = {
  async listarPorPublicacao(publicacaoId: number | string): Promise<PublicacaoDocente[]> {
    const pId = typeof publicacaoId === 'string' ? parseInt(publicacaoId, 10) : publicacaoId
    const { data, error } = await (supabase.from as any)('publicacoes_docentes')
      .select('*')
      .eq('publicacao_id', pId)
    if (error) throw error
    return (data || []) as PublicacaoDocente[]
  },

  async listarDocentesPorPublicacao(publicacaoId: number | string): Promise<Docente[]> {
    const pId = typeof publicacaoId === 'string' ? parseInt(publicacaoId, 10) : publicacaoId
    const { data, error } = await (supabase.from as any)('publicacoes_docentes')
      .select('docente_id, docentes(*)')
      .eq('publicacao_id', pId)
    if (error) throw error
    return (data || []).map((r: any) => r.docentes).filter(Boolean) as Docente[]
  },

  async listarTodos(): Promise<PublicacaoDocente[]> {
    const { data, error } = await (supabase.from as any)('publicacoes_docentes').select('*')
    if (error) throw error
    return (data || []) as PublicacaoDocente[]
  },

  async vincularDocente(publicacaoId: number | string, docenteId: number | string): Promise<void> {
    const pId = typeof publicacaoId === 'string' ? parseInt(publicacaoId, 10) : publicacaoId
    const dId = typeof docenteId === 'string' ? parseInt(docenteId, 10) : docenteId

    // Verifica se já existe para garantir idempotência
    const { data: existente } = await (supabase.from as any)('publicacoes_docentes')
      .select('id')
      .eq('publicacao_id', pId)
      .eq('docente_id', dId)
      .maybeSingle()

    if (existente) return

    const { error } = await (supabase.from as any)('publicacoes_docentes').insert({
      publicacao_id: pId,
      docente_id: dId,
    })
    if (error) throw error
  },

  async desvincularDocente(
    publicacaoId: number | string,
    docenteId: number | string,
  ): Promise<void> {
    const pId = typeof publicacaoId === 'string' ? parseInt(publicacaoId, 10) : publicacaoId
    const dId = typeof docenteId === 'string' ? parseInt(docenteId, 10) : docenteId

    const { error } = await (supabase.from as any)('publicacoes_docentes')
      .delete()
      .eq('publicacao_id', pId)
      .eq('docente_id', dId)
    if (error) throw error
  },

  async desvincularPorId(id: number | string): Promise<void> {
    const { error } = await (supabase.from as any)('publicacoes_docentes').delete().eq('id', id)
    if (error) throw error
  },

  async sincronizarDocentes(
    publicacaoId: number | string,
    novosDocenteIds: (number | string)[],
  ): Promise<void> {
    const pId = typeof publicacaoId === 'string' ? parseInt(publicacaoId, 10) : publicacaoId
    const desejados = new Set<number>(novosDocenteIds.map((id) => Number(id)))

    const { data: atuais, error: fetchError } = await (supabase.from as any)('publicacoes_docentes')
      .select('id, docente_id')
      .eq('publicacao_id', pId)
    if (fetchError) throw fetchError

    const atuaisIds = new Set<number>((atuais || []).map((r: any) => Number(r.docente_id)))

    const paraRemover = (atuais || []).filter((r: any) => !desejados.has(Number(r.docente_id)))
    if (paraRemover.length > 0) {
      const ids = paraRemover.map((r: any) => r.id)
      const { error: delError } = await (supabase.from as any)('publicacoes_docentes')
        .delete()
        .in('id', ids)
      if (delError) throw delError
    }

    const paraInserir = Array.from(desejados).filter((id) => !atuaisIds.has(id))
    if (paraInserir.length > 0) {
      const rows = paraInserir.map((docente_id) => ({
        publicacao_id: pId,
        docente_id,
      }))
      const { error: insError } = await (supabase.from as any)('publicacoes_docentes').insert(rows)
      if (insError) throw insError
    }
  },
}
