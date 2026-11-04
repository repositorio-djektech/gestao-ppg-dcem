import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/types/database'
import { podeEditarTextoItem13 } from '@/services/permissoes'
import { CHAVE_ITEM_1_3, validarTextoPoliticasAfirmativas } from '@/lib/ppg/politicas-afirmativas'

type Cliente = typeof supabase

export type ResultadoSalvarTexto =
  | { ok: true }
  | { ok: false; motivo: 'sem_permissao' | 'muito_longo' }
  | { ok: false; motivo: 'erro'; mensagem: string }

/** Texto do item 1.3 (H-10). Vazio quando ainda não foi cadastrado. */
export async function obterTextoPoliticasAfirmativas(client: Cliente = supabase): Promise<string> {
  const { data, error } = await (client as any)
    .from('ppg_textos')
    .select('texto')
    .eq('chave', CHAVE_ITEM_1_3)
    .maybeSingle()
  if (error) throw new Error(error.message || 'Erro ao ler o texto do item 1.3.')
  return data?.texto ?? ''
}

/** Grava o texto (uma linha por chave). Papel e tamanho são checados antes de qualquer acesso ao banco. */
export async function salvarTextoPoliticasAfirmativas(
  params: { role: Role | null | undefined; texto: string },
  client: Cliente = supabase,
): Promise<ResultadoSalvarTexto> {
  if (!podeEditarTextoItem13(params.role)) return { ok: false, motivo: 'sem_permissao' }
  const validacao = validarTextoPoliticasAfirmativas(params.texto)
  if ('motivo' in validacao) return { ok: false, motivo: validacao.motivo }

  const { error } = await (client as any)
    .from('ppg_textos')
    .upsert(
      { chave: CHAVE_ITEM_1_3, texto: validacao.texto, updated_at: new Date().toISOString() },
      { onConflict: 'chave' },
    )
  if (error) return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao salvar.' }
  return { ok: true }
}
