/**
 * Nota de corte do PDQ por ano da avaliação do docente (IN 02/2026, art. 8º, §6º; D-36).
 * Leitura: todo usuário autenticado. Escrita: suporte e coordenador (a RLS também exige).
 * Ano sem nota cadastrada usa 1,0 (padrão).
 */
import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/types/database'
import { podeEditarConfiguracoes } from '@/services/permissoes'
import { NOTA_CORTE_PADRAO } from '../../supabase/functions/avaliacao-reconducao/pdq'

type Cliente = typeof supabase

export interface NotaCorte {
  anoAvaliacao: number
  notaCorte: number
  observacao: string
}

export type ResultadoNotaCorte =
  | { ok: true }
  | { ok: false; motivo: 'sem_permissao' }
  | { ok: false; motivo: 'invalido' | 'erro'; mensagem: string }

export { NOTA_CORTE_PADRAO }

export function validarNotaCorte(ano: number, nota: number): string | null {
  if (!Number.isInteger(ano) || ano < 1990 || ano > 2100)
    return 'Informe um ano de avaliação válido.'
  if (!Number.isFinite(nota) || nota < 0)
    return 'A nota de corte deve ser um número maior ou igual a zero.'
  return null
}

export async function listarNotasCorte(client: Cliente = supabase): Promise<NotaCorte[]> {
  const { data, error } = await (client as any)
    .from('avaliacao_notas_corte')
    .select('ano_avaliacao, nota_corte, observacao')
    .order('ano_avaliacao', { ascending: false })
  if (error) throw new Error(error.message || 'Erro ao ler as notas de corte.')
  return (data || []).map((l: any) => ({
    anoAvaliacao: Number(l.ano_avaliacao),
    notaCorte: Number(l.nota_corte),
    observacao: l.observacao ?? '',
  }))
}

/** Nota de corte do ano da avaliação; sem cadastro (ou sem leitura) vale 1,0. */
export async function obterNotaCorte(
  anoAvaliacao: number,
  client: Cliente = supabase,
): Promise<number> {
  try {
    const { data, error } = await (client as any)
      .from('avaliacao_notas_corte')
      .select('nota_corte')
      .eq('ano_avaliacao', anoAvaliacao)
      .maybeSingle()
    if (error || !data) return NOTA_CORTE_PADRAO
    const n = Number(data.nota_corte)
    return Number.isFinite(n) ? n : NOTA_CORTE_PADRAO
  } catch {
    return NOTA_CORTE_PADRAO
  }
}

export async function salvarNotaCorte(
  params: { role: Role | null | undefined; nota: NotaCorte },
  client: Cliente = supabase,
): Promise<ResultadoNotaCorte> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const { anoAvaliacao, notaCorte, observacao } = params.nota
  const erro = validarNotaCorte(anoAvaliacao, notaCorte)
  if (erro) return { ok: false, motivo: 'invalido', mensagem: erro }
  const { data, error } = await (client as any)
    .from('avaliacao_notas_corte')
    .upsert(
      {
        ano_avaliacao: anoAvaliacao,
        nota_corte: notaCorte,
        observacao: observacao ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ano_avaliacao' },
    )
    .select('ano_avaliacao')
  if (error)
    return {
      ok: false,
      motivo: 'erro',
      mensagem: error.message || 'Erro ao salvar a nota de corte.',
    }
  if (!data || data.length === 0) return { ok: false, motivo: 'sem_permissao' }
  return { ok: true }
}

export async function excluirNotaCorte(
  params: { role: Role | null | undefined; anoAvaliacao: number },
  client: Cliente = supabase,
): Promise<ResultadoNotaCorte> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const { data, error } = await (client as any)
    .from('avaliacao_notas_corte')
    .delete()
    .eq('ano_avaliacao', params.anoAvaliacao)
    .select('ano_avaliacao')
  if (error)
    return {
      ok: false,
      motivo: 'erro',
      mensagem: error.message || 'Erro ao apagar a nota de corte.',
    }
  if (!data || data.length === 0) return { ok: false, motivo: 'sem_permissao' }
  return { ok: true }
}
