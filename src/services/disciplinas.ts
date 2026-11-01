import { createCrudService } from '@/services/crud'
import { supabase } from '@/lib/supabase/client'
import type { Disciplina, DisciplinaDocente, Docente } from '@/types/database'

const baseCrud = createCrudService<Disciplina>({
  table: 'disciplinas',
  orderBy: 'nome',
  ascending: true,
})

export const disciplinasService = {
  ...baseCrud,

  /**
   * Lista todas as disciplinas acoplando a lista de IDs de docentes vinculados
   */
  async list(): Promise<Disciplina[]> {
    const disciplinas = await baseCrud.list()
    if (!disciplinas.length) return []

    // Buscar todos os vínculos de disciplinas_docentes
    const { data: vinculos, error } = await (supabase.from as any)('disciplinas_docentes').select(
      'disciplina_id, docente_id',
    )

    if (error) {
      console.error('Erro ao buscar vinculos disciplinas_docentes:', error)
      return disciplinas
    }

    const mapaDocentes: Record<number, number[]> = {}
    for (const v of vinculos || []) {
      const discId = Number(v.disciplina_id)
      const docId = Number(v.docente_id)
      if (!mapaDocentes[discId]) mapaDocentes[discId] = []
      mapaDocentes[discId].push(docId)
    }

    return disciplinas.map((d) => ({
      ...d,
      docentes_ids: mapaDocentes[Number(d.id)] || (d.docente_id ? [Number(d.docente_id)] : []),
    }))
  },

  /**
   * Obtém uma disciplina por ID incluindo os docentes vinculados
   */
  async getById(id: number | string): Promise<Disciplina | null> {
    const disciplina = await baseCrud.getById(id)
    if (!disciplina) return null

    const { data: vinculos, error } = await (supabase.from as any)('disciplinas_docentes')
      .select('docente_id')
      .eq('disciplina_id', id)

    if (error) throw error

    const docentes_ids = (vinculos || []).map((v: any) => Number(v.docente_id))
    return {
      ...disciplina,
      docentes_ids,
    }
  },

  /**
   * Cria a disciplina e em seguida grava os vínculos de docentes N:N
   */
  async create(item: Partial<Disciplina>): Promise<Disciplina> {
    const { docentes_ids, ...dadosDisciplina } = item as any
    // Se houver docentes_ids, mantemos docente_id como o primeiro para compatibilidade retroativa
    if (Array.isArray(docentes_ids) && docentes_ids.length > 0) {
      dadosDisciplina.docente_id = Number(docentes_ids[0])
    }

    const novaDisciplina = await baseCrud.create(dadosDisciplina)

    if (Array.isArray(docentes_ids) && docentes_ids.length > 0) {
      await this.sincronizarDocentes(novaDisciplina.id, docentes_ids)
    }

    return {
      ...novaDisciplina,
      docentes_ids: docentes_ids || [],
    }
  },

  /**
   * Atualiza a disciplina e substitui o conjunto de docentes vinculados
   */
  async update(id: number | string, item: Partial<Disciplina>): Promise<Disciplina> {
    const { docentes_ids, ...dadosDisciplina } = item as any
    if (Array.isArray(docentes_ids)) {
      dadosDisciplina.docente_id = docentes_ids.length > 0 ? Number(docentes_ids[0]) : null
    }

    const disciplinaAtualizada = await baseCrud.update(id, dadosDisciplina)

    if (Array.isArray(docentes_ids)) {
      await this.sincronizarDocentes(id, docentes_ids)
    }

    return {
      ...disciplinaAtualizada,
      docentes_ids: docentes_ids ?? [],
    }
  },

  /**
   * Lista todos os vínculos de disciplinas_docentes
   */
  async listarTodosVinculos(): Promise<DisciplinaDocente[]> {
    const { data, error } = await (supabase.from as any)('disciplinas_docentes').select('*')
    if (error) throw error
    return (data || []) as DisciplinaDocente[]
  },

  /**
   * Lista os docentes vinculados a uma disciplina específica
   */
  async listarDocentesDaDisciplina(disciplinaId: number | string): Promise<Docente[]> {
    const { data, error } = await (supabase.from as any)('disciplinas_docentes')
      .select('docente_id, docentes(*)')
      .eq('disciplina_id', disciplinaId)
    if (error) throw error
    return (data || []).map((item: any) => item.docentes).filter(Boolean) as Docente[]
  },

  /**
   * Substitui atomicamente o conjunto de docentes vinculados à disciplina
   */
  async sincronizarDocentes(
    disciplinaId: number | string,
    novosDocentesIds: (number | string)[],
  ): Promise<void> {
    const discId = typeof disciplinaId === 'string' ? parseInt(disciplinaId, 10) : disciplinaId
    const desejadosNumericos = Array.from(
      new Set(
        novosDocentesIds
          .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
          .filter((id) => !isNaN(id) && id > 0),
      ),
    )

    // Buscar vínculos existentes
    const { data: atuais, error: fetchError } = await (supabase.from as any)('disciplinas_docentes')
      .select('id, docente_id')
      .eq('disciplina_id', discId)
    if (fetchError) throw fetchError

    const atuaisIds = new Set<number>((atuais || []).map((r: any) => Number(r.docente_id)))
    const desejadosSet = new Set<number>(desejadosNumericos)

    // Remover os que não estão mais no conjunto desejado
    const paraRemover = (atuais || []).filter((r: any) => !desejadosSet.has(Number(r.docente_id)))
    if (paraRemover.length > 0) {
      const idsParaRemover = paraRemover.map((r: any) => r.id)
      const { error: delError } = await (supabase.from as any)('disciplinas_docentes')
        .delete()
        .in('id', idsParaRemover)
      if (delError) throw delError
    }

    // Inserir os novos
    const paraInserir = desejadosNumericos.filter((id) => !atuaisIds.has(id))
    if (paraInserir.length > 0) {
      const rows = paraInserir.map((docente_id) => ({
        disciplina_id: discId,
        docente_id,
      }))
      const { error: insError } = await (supabase.from as any)('disciplinas_docentes').insert(rows)
      if (insError) throw insError
    }
  },
}
