/**
 * Discentes ligados a patentes, produção técnica e eventos (P-35), no molde de
 * `vinculos-docentes-registro`. Recebe o cliente por parâmetro para ser testável sem banco.
 * Quem pode gravar é decidido pela RLS: coordenação em todos; docente nos registros a que está
 * vinculado (patentes e produção técnica); eventos só a coordenação.
 */
import { supabase } from '@/lib/supabase/client'

type Cliente = typeof supabase

export type TabelaVinculoDiscente =
  | 'patentes_discentes'
  | 'producao_tecnica_discentes'
  | 'eventos_discentes'
export type ColunaRegistroDiscente = 'patente_id' | 'producao_tecnica_id' | 'evento_id'

export function criarServicoVinculosDiscentes(
  tabela: TabelaVinculoDiscente,
  coluna: ColunaRegistroDiscente,
  client: Cliente = supabase,
) {
  const t = () => (client as any).from(tabela)

  return {
    /** Mapa registro → ids dos discentes ligados. */
    async listarPorRegistro(): Promise<Record<number, number[]>> {
      const { data, error } = await t().select('*')
      if (error) throw error
      const mapa: Record<number, number[]> = {}
      for (const r of (data || []) as any[]) {
        const id = Number(r[coluna])
        ;(mapa[id] ||= []).push(Number(r.discente_id))
      }
      return mapa
    },

    /** Deixa o registro com exatamente estes discentes (insere os novos, remove os que saíram). */
    async sincronizar(registroId: number | string, discenteIds: Array<number | string>) {
      const rId = Number(registroId)
      const { data: atuais, error: errLeitura } = await t()
        .select('id, discente_id')
        .eq(coluna, rId)
      if (errLeitura) throw errLeitura
      const jaLigados = new Set<number>((atuais || []).map((r: any) => Number(r.discente_id)))
      const desejados = new Set<number>(discenteIds.map((i) => Number(i)).filter(Boolean))

      const remover = (atuais || []).filter((r: any) => !desejados.has(Number(r.discente_id)))
      if (remover.length > 0) {
        const { error } = await t()
          .delete()
          .in(
            'id',
            remover.map((r: any) => r.id),
          )
        if (error) throw error
      }
      const inserir = [...desejados].filter((id) => !jaLigados.has(id))
      if (inserir.length > 0) {
        const { error } = await t().insert(
          inserir.map((discente_id) => ({ [coluna]: rId, discente_id })),
        )
        if (error) throw error
      }
    },
  }
}

export const patentesDiscentesService = criarServicoVinculosDiscentes(
  'patentes_discentes',
  'patente_id',
)
export const producaoTecnicaDiscentesService = criarServicoVinculosDiscentes(
  'producao_tecnica_discentes',
  'producao_tecnica_id',
)
export const eventosDiscentesService = criarServicoVinculosDiscentes(
  'eventos_discentes',
  'evento_id',
)
