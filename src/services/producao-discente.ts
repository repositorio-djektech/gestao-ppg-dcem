/**
 * Produção ligada a um discente (P-35): o que aparece na orientação, junto do título da dissertação
 * ou tese (TCC). Só leitura. Reúne:
 *  - publicações em que o discente é coautor confirmado (publicacoes_coautores_programa);
 *  - patentes, produção técnica e eventos a que o discente foi ligado (patentes_discentes,
 *    producao_tecnica_discentes, eventos_discentes).
 */
import { supabase } from '@/lib/supabase/client'

type Cliente = typeof supabase

export interface ItemProducao {
  id: number
  titulo: string
  ano?: number | string | null
  detalhe?: string
}

export interface ProducaoDoDiscente {
  publicacoes: ItemProducao[]
  patentes: ItemProducao[]
  producaoTecnica: ItemProducao[]
  eventos: ItemProducao[]
}

export const PRODUCAO_VAZIA: ProducaoDoDiscente = {
  publicacoes: [],
  patentes: [],
  producaoTecnica: [],
  eventos: [],
}

async function idsLigados(
  client: Cliente,
  tabela: string,
  colunaRegistro: string,
  discenteId: number,
): Promise<number[]> {
  const { data, error } = await (client as any)
    .from(tabela)
    .select(colunaRegistro)
    .eq('discente_id', discenteId)
  if (error) return [] // tabela ainda não criada ou sem permissão: não derruba a tela
  return Array.from(
    new Set<number>((data || []).map((r: any) => Number(r[colunaRegistro])).filter(Boolean)),
  )
}

async function registros(
  client: Cliente,
  tabela: string,
  colunas: string,
  ids: number[],
): Promise<any[]> {
  if (ids.length === 0) return []
  const { data, error } = await (client as any).from(tabela).select(colunas).in('id', ids)
  return error ? [] : data || []
}

export async function listarProducaoDoDiscente(
  discenteId: number,
  client: Cliente = supabase,
): Promise<ProducaoDoDiscente> {
  if (!discenteId) return PRODUCAO_VAZIA

  const { data: coautorias } = await (client as any)
    .from('publicacoes_coautores_programa')
    .select('publicacao_id, tipo')
    .eq('discente_id', discenteId)
  const idsPub: number[] = Array.from(
    new Set<number>(
      ((coautorias || []) as any[])
        .filter((c) => c.tipo !== 'sem_coautoria')
        .map((c) => Number(c.publicacao_id)),
    ),
  )
  const [idsPat, idsPt, idsEv] = await Promise.all([
    idsLigados(client, 'patentes_discentes', 'patente_id', discenteId),
    idsLigados(client, 'producao_tecnica_discentes', 'producao_tecnica_id', discenteId),
    idsLigados(client, 'eventos_discentes', 'evento_id', discenteId),
  ])
  const [pubs, pats, pts, evs] = await Promise.all([
    registros(client, 'publicacoes', 'id, titulo, ano, periodico, estrato_qualis', idsPub),
    registros(client, 'patentes', 'id, titulo, status, inpi', idsPat),
    registros(client, 'producao_tecnica', 'id, titulo, ano, tipo', idsPt),
    registros(client, 'eventos', 'id, evento, local_data, papel', idsEv),
  ])

  const porAnoDesc = (a: ItemProducao, b: ItemProducao) => Number(b.ano ?? 0) - Number(a.ano ?? 0)
  return {
    publicacoes: pubs
      .map((p) => ({
        id: p.id,
        titulo: p.titulo,
        ano: p.ano,
        detalhe: [p.periodico, p.estrato_qualis ? `Qualis ${p.estrato_qualis}` : '']
          .filter(Boolean)
          .join(' · '),
      }))
      .sort(porAnoDesc),
    patentes: pats.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      detalhe: [p.status, p.inpi].filter(Boolean).join(' · '),
    })),
    producaoTecnica: pts
      .map((p) => ({ id: p.id, titulo: p.titulo, ano: p.ano, detalhe: p.tipo || '' }))
      .sort(porAnoDesc),
    eventos: evs.map((e) => ({
      id: e.id,
      titulo: e.evento,
      detalhe: [e.local_data, e.papel].filter(Boolean).join(' · '),
    })),
  }
}

/** Total de itens de produção do discente. */
export function totalProducao(p: ProducaoDoDiscente): number {
  return p.publicacoes.length + p.patentes.length + p.producaoTecnica.length + p.eventos.length
}
