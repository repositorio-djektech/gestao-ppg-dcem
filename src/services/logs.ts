import { supabase } from '@/lib/supabase/client'
import type { LogRegistro, LogAcao } from '@/types/database'

export interface RegistrarLogParams {
  acao: LogAcao
  entidade: string
  entidade_id?: number | string | null
  detalhes?: Record<string, any> | string | null
  user_id?: string | null
  user_email?: string | null
  user_nome?: string | null
}

/**
 * Registra uma ação de auditoria na tabela `logs`.
 * Operação BEST-EFFORT: nunca lança erro ou interrompe o fluxo principal caso falhe.
 */
export async function registrarLog(params: RegistrarLogParams): Promise<void> {
  try {
    let userId = params.user_id ?? null
    let userEmail = params.user_email ?? ''
    let userNome = params.user_nome ?? ''

    // Se o usuário não foi passado diretamente, tenta obter da sessão ativa
    if (!userId) {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data?.session?.user
        if (currentUser) {
          userId = currentUser.id
          userEmail = userEmail || currentUser.email || ''
          userNome =
            userNome ||
            (currentUser.user_metadata?.name as string) ||
            (currentUser.user_metadata?.nome as string) ||
            currentUser.email ||
            ''
        }
      } catch {
        // Ignora falhas na recuperação de sessão
      }
    }

    // Normaliza detalhes como objeto JSON
    let detalhesJson: Record<string, any> = {}
    if (params.detalhes && typeof params.detalhes === 'object') {
      detalhesJson = params.detalhes
    } else if (params.detalhes !== null && params.detalhes !== undefined) {
      detalhesJson = { resumo: String(params.detalhes) }
    }

    await (supabase.from as any)('logs').insert({
      user_id: userId,
      user_email: userEmail,
      user_nome: userNome,
      acao: params.acao,
      entidade: params.entidade,
      entidade_id:
        params.entidade_id !== null && params.entidade_id !== undefined
          ? String(params.entidade_id)
          : null,
      detalhes: detalhesJson,
    })
  } catch (err) {
    // Gravação de auditoria é silenciosa para nunca quebrar a operação do usuário
    console.warn('Falha silenciosa ao registrar log de auditoria:', err)
  }
}

export const logsService = {
  registrar: registrarLog,
  async listar(limite = 100): Promise<LogRegistro[]> {
    try {
      const { data, error } = await (supabase.from as any)('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)
      if (error) throw error
      return (data ?? []) as LogRegistro[]
    } catch (err) {
      console.warn('Erro ao listar logs de auditoria:', err)
      return []
    }
  },
}
