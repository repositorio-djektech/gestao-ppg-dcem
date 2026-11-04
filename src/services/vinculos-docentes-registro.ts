import { supabase } from '@/lib/supabase/client'

type Cliente = typeof supabase

export type TabelaVinculoDocente = 'patentes_docentes' | 'producao_tecnica_docentes'
export type ColunaRegistro = 'patente_id' | 'producao_tecnica_id'

export interface VinculoDocenteRegistro {
  id: number
  docente_id: number
  [coluna: string]: number
}

/**
 * Vínculo registro ↔ docente (patentes e produção técnica, D-27), no mesmo molde de
 * `publicacoes_docentes`. Recebe o cliente por parâmetro para ser testável sem banco.
 */
export function criarServicoVinculosDocentes(
  tabela: TabelaVinculoDocente,
  coluna: ColunaRegistro,
  client: Cliente = supabase,
) {
  const t = () => (client as any).from(tabela)

  return {
    async listarTodos(): Promise<VinculoDocenteRegistro[]> {
      const { data, error } = await t().select('*')
      if (error) throw error
      return (data || []) as VinculoDocenteRegistro[]
    },

    /**
     * Sincroniza os docentes de um registro.
     * - Coordenação: a lista inteira (insere os novos, remove os que saíram).
     * - Docente (`somenteDocenteId`): só garante o PRÓPRIO vínculo. A RLS só deixa o docente
     *   inserir e apagar a própria linha, então os dos demais ficam como estão.
     */
    async sincronizarDocentes(
      registroId: number | string,
      docenteIds: Array<number | string>,
      opcoes: { somenteDocenteId?: number | null } = {},
    ): Promise<void> {
      const rId = Number(registroId)
      const { data: atuais, error: errLeitura } = await t().select('id, docente_id').eq(coluna, rId)
      if (errLeitura) throw errLeitura
      const jaVinculados = new Set<number>((atuais || []).map((r: any) => Number(r.docente_id)))

      if (opcoes.somenteDocenteId) {
        const eu = Number(opcoes.somenteDocenteId)
        if (!jaVinculados.has(eu)) {
          const { error } = await t().insert([{ [coluna]: rId, docente_id: eu }])
          if (error) throw error
        }
        return
      }

      const desejados = new Set<number>(docenteIds.map((id) => Number(id)))
      const remover = (atuais || []).filter((r: any) => !desejados.has(Number(r.docente_id)))
      if (remover.length > 0) {
        const { error } = await t()
          .delete()
          .in(
            'id',
            remover.map((r: any) => r.id),
          )
        if (error) throw error
      }
      const inserir = Array.from(desejados).filter((id) => !jaVinculados.has(id))
      if (inserir.length > 0) {
        const { error } = await t().insert(
          inserir.map((docente_id) => ({ [coluna]: rId, docente_id })),
        )
        if (error) throw error
      }
    },
  }
}

export const patentesDocentesService = criarServicoVinculosDocentes(
  'patentes_docentes',
  'patente_id',
)
export const producaoTecnicaDocentesService = criarServicoVinculosDocentes(
  'producao_tecnica_docentes',
  'producao_tecnica_id',
)
