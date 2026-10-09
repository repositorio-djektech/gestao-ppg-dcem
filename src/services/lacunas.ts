import { supabase } from '@/lib/supabase/client'
import type { RelatorioLacunasResposta } from '@/lib/lacunas/types'
import { consolidarRelatorioLacunas } from '@/lib/lacunas/regras'
import type { Docente, Discente } from '@/types/database'

export interface ObterRelatorioLacunasOpcoes {
  /** Injeção de invoker para testes unitários */
  invokeFn?: (functionName: string, options?: { body?: any }) => Promise<{ data: any; error: any }>
  /** Força execução local direta contra o Supabase (fallback/offline) */
  executarLocal?: boolean
}

export interface ResultadoRelatorioLacunas {
  sucesso: boolean
  dados?: RelatorioLacunasResposta
  mensagemErro?: string
  origem?: 'edge_function' | 'local_fallback'
}

/**
 * Obtém o relatório consolidado de lacunas de preenchimento.
 * Tenta primariamente a Edge Function `relatorio-lacunas`.
 * Em caso de indisponibilidade de edge functions, provê fallback transparente
 * executando as mesmas regras TypeScript sobre as tabelas via Supabase client.
 */
export async function obterRelatorioLacunas(
  opcoes: ObterRelatorioLacunasOpcoes = {},
): Promise<ResultadoRelatorioLacunas> {
  const { invokeFn, executarLocal } = opcoes

  if (!executarLocal) {
    try {
      const invoker = invokeFn ?? supabase.functions.invoke.bind(supabase.functions)
      const { data, error } = await invoker('relatorio-lacunas', {
        body: {},
      })

      if (!error && data && Array.isArray(data.resumo) && Array.isArray(data.lacunas)) {
        return {
          sucesso: true,
          dados: data as RelatorioLacunasResposta,
          origem: 'edge_function',
        }
      }

      if (error) {
        console.warn(
          '[obterRelatorioLacunas] Falha ao invocar edge function relatorio-lacunas, tentando fallback local:',
          error.message,
        )
      }
    } catch (edgeErr: any) {
      console.warn(
        '[obterRelatorioLacunas] Exceção na edge function, recorrendo ao fallback local:',
        edgeErr?.message,
      )
    }
  }

  // Fallback seguro usando client padrão do Supabase
  try {
    const [docentesRes, discentesRes] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, scopus_id, openalex_id, id_lattes, indice_h, bolsa_cnpq, jdp, licenca')
        .order('nome', { ascending: true }),
      supabase
        .from('discentes')
        .select('id, nome, cpf, data_ingresso, status, link_lattes, link_comprovacao, observacoes')
        .order('nome', { ascending: true }),
    ])

    if (docentesRes.error) {
      return {
        sucesso: false,
        mensagemErro: `Erro ao buscar docentes: ${docentesRes.error.message}`,
      }
    }

    if (discentesRes.error) {
      return {
        sucesso: false,
        mensagemErro: `Erro ao buscar discentes: ${discentesRes.error.message}`,
      }
    }

    const docentes = (docentesRes.data || []) as unknown as Docente[]
    const discentes = (discentesRes.data || []) as unknown as Discente[]

    const relatorio = consolidarRelatorioLacunas({
      docentes,
      discentes,
    })

    return {
      sucesso: true,
      dados: relatorio,
      origem: 'local_fallback',
    }
  } catch (err: any) {
    return {
      sucesso: false,
      mensagemErro: err?.message || 'Falha ao consolidar dados de lacunas.',
    }
  }
}
