/**
 * Períodos de avaliação e configuração geral do PPG (D-32).
 * Leitura: todo usuário autenticado. Escrita: suporte e coordenador (a RLS também exige).
 * Papel e dados são checados antes de qualquer acesso ao banco.
 */
import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/types/database'
import { podeEditarConfiguracoes } from '@/services/permissoes'
import {
  CONFIGURACAO_PADRAO,
  configuracaoDeLinha,
  periodoDeLinha,
  validarConfiguracao,
  validarPeriodo,
  type ConfiguracaoPpg,
  type PeriodoAvaliacao,
} from '@/lib/periodos/periodo'

type Cliente = typeof supabase

export type ResultadoPeriodos =
  | { ok: true }
  | { ok: false; motivo: 'sem_permissao' }
  | { ok: false; motivo: 'invalido' | 'erro'; mensagem: string }

/** Períodos cadastrados, do mais recente para o mais antigo. */
export async function listarPeriodos(client: Cliente = supabase): Promise<PeriodoAvaliacao[]> {
  const { data, error } = await (client as any)
    .from('periodos_avaliacao')
    .select('id, nome, ano_inicio, ano_fim, ativo, ano_referencia')
    .order('ano_inicio', { ascending: false })
  if (error) throw new Error(error.message || 'Erro ao ler os períodos de avaliação.')
  return (data || []).map(periodoDeLinha)
}

/** Configuração geral; sem linha cadastrada, vale o padrão (Lattes desde 2020). */
export async function obterConfiguracao(client: Cliente = supabase): Promise<ConfiguracaoPpg> {
  const { data, error } = await (client as any)
    .from('ppg_configuracoes')
    .select('lattes_ano_inicio, lattes_ano_fim')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message || 'Erro ao ler a configuração do PPG.')
  return data ? configuracaoDeLinha(data) : CONFIGURACAO_PADRAO
}

export async function salvarPeriodo(
  params: {
    role: Role | null | undefined
    periodo: {
      id?: number | null
      nome: string
      anoInicio: number
      anoFim: number
      anoReferencia?: number | null
    }
  },
  client: Cliente = supabase,
): Promise<ResultadoPeriodos> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const p = params.periodo
  const erro = validarPeriodo(p)
  if (erro) return { ok: false, motivo: 'invalido', mensagem: erro }

  const linha = {
    nome: p.nome.trim(),
    ano_inicio: p.anoInicio,
    ano_fim: p.anoFim,
    ano_referencia: p.anoReferencia ?? null,
    updated_at: new Date().toISOString(),
  }
  const consulta = p.id
    ? (client as any).from('periodos_avaliacao').update(linha).eq('id', p.id).select('id')
    : (client as any)
        .from('periodos_avaliacao')
        .insert([{ ...linha, ativo: false }])
        .select('id')
  const { data, error } = await consulta
  if (error)
    return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao salvar o período.' }
  if (!data || data.length === 0) return { ok: false, motivo: 'sem_permissao' }
  return { ok: true }
}

/** Torna o período o ativo (troca atômica no banco). */
export async function ativarPeriodo(
  params: { role: Role | null | undefined; id: number },
  client: Cliente = supabase,
): Promise<ResultadoPeriodos> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const { error } = await (client as any).rpc('ativar_periodo_avaliacao', { p_id: params.id })
  if (error)
    return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao ativar o período.' }
  return { ok: true }
}

/** Apaga um período que não é o ativo. */
export async function excluirPeriodo(
  params: { role: Role | null | undefined; id: number },
  client: Cliente = supabase,
): Promise<ResultadoPeriodos> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const { data, error } = await (client as any)
    .from('periodos_avaliacao')
    .delete()
    .eq('id', params.id)
    .select('id')
  if (error)
    return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao apagar o período.' }
  if (!data || data.length === 0) {
    return {
      ok: false,
      motivo: 'erro',
      mensagem: 'O período ativo não pode ser apagado. Ative outro antes.',
    }
  }
  return { ok: true }
}

export async function salvarConfiguracao(
  params: { role: Role | null | undefined; configuracao: ConfiguracaoPpg },
  client: Cliente = supabase,
): Promise<ResultadoPeriodos> {
  if (!podeEditarConfiguracoes(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const erro = validarConfiguracao(params.configuracao)
  if (erro) return { ok: false, motivo: 'invalido', mensagem: erro }
  const { error } = await (client as any).from('ppg_configuracoes').upsert(
    {
      id: 1,
      lattes_ano_inicio: params.configuracao.lattesAnoInicio,
      lattes_ano_fim: params.configuracao.lattesAnoFim,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error)
    return {
      ok: false,
      motivo: 'erro',
      mensagem: error.message || 'Erro ao salvar a configuração.',
    }
  return { ok: true }
}
