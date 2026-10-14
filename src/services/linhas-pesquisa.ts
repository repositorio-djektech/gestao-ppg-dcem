import { createCrudService } from './crud'
import { supabase } from '@/lib/supabase/client'
import type { LinhaPesquisa, DocenteLinha } from '@/types/database'

export const linhasPesquisaService = {
  ...createCrudService<LinhaPesquisa>({
    table: 'linhas_pesquisa',
    orderBy: 'nome',
    ascending: true,
  }),

  async listarLinhasDoDocente(docenteId: number | string): Promise<LinhaPesquisa[]> {
    const { data, error } = await (supabase.from as any)('docentes_linhas')
      .select('linha_id, linhas_pesquisa(*)')
      .eq('docente_id', docenteId)
    if (error) throw error
    return (data || []).map((item: any) => item.linhas_pesquisa).filter(Boolean) as LinhaPesquisa[]
  },

  async listarTodasDocentesLinhas(): Promise<DocenteLinha[]> {
    const { data, error } = await (supabase.from as any)('docentes_linhas').select('*')
    if (error) throw error
    return (data || []) as DocenteLinha[]
  },

  async sincronizarLinhasDocente(
    docenteId: number | string,
    novosLinhasIds: number[],
  ): Promise<void> {
    const dId = typeof docenteId === 'string' ? parseInt(docenteId, 10) : docenteId
    // Buscar vínculos existentes
    const { data: atuais, error: fetchError } = await (supabase.from as any)('docentes_linhas')
      .select('id, linha_id')
      .eq('docente_id', dId)
    if (fetchError) throw fetchError

    const atuaisIds = new Set<number>((atuais || []).map((r: any) => Number(r.linha_id)))
    const desejadosIds = new Set<number>(novosLinhasIds.map((id) => Number(id)))

    // A remover: atuais que não estão em desejados
    const paraRemover = (atuais || []).filter((r: any) => !desejadosIds.has(Number(r.linha_id)))
    if (paraRemover.length > 0) {
      const idsParaRemover = paraRemover.map((r: any) => r.id)
      const { error: delError } = await (supabase.from as any)('docentes_linhas')
        .delete()
        .in('id', idsParaRemover)
      if (delError) throw delError
    }

    // A inserir: desejados que não estão em atuais
    const paraInserir = novosLinhasIds.filter((id) => !atuaisIds.has(Number(id)))
    if (paraInserir.length > 0) {
      const rows = paraInserir.map((linha_id) => ({
        docente_id: dId,
        linha_id: Number(linha_id),
      }))
      const { error: insError } = await (supabase.from as any)('docentes_linhas').insert(rows)
      if (insError) throw insError
    }
  },
}
