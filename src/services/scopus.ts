/**
 * Serviço de comunicação com o backend Supabase para a integração Scopus.
 * Chama a Edge Function `scopus-buscar` de forma segura sem expor a API key no browser.
 */

import { supabase } from '@/lib/supabase/client'
import {
  type ScopusAutorCandidato,
  type BuscarAutoresScopusOpcoes,
  type ResultadoBuscaScopus,
  normalizarNomeParaScopus,
} from '@/lib/scopus/buscar'

export type { ScopusAutorCandidato, BuscarAutoresScopusOpcoes, ResultadoBuscaScopus }

export interface ScopusServiceOptions extends BuscarAutoresScopusOpcoes {
  /** Injeção de invocador para testes ou cenários customizados */
  invokeFn?: (functionName: string, options?: { body?: any }) => Promise<{ data: any; error: any }>
}

/**
 * Consulta a Edge Function `scopus-buscar` no Supabase.
 * Nunca faz chamadas diretas à API da Elsevier a partir do navegador para não expor a chave.
 */
export async function buscarAutoresScopus(
  termo: string,
  opcoes: ScopusServiceOptions = {},
): Promise<ResultadoBuscaScopus> {
  const termoNormalizado = normalizarNomeParaScopus(termo)
  if (!termoNormalizado) {
    return {
      sucesso: true,
      candidatos: [],
      total: 0,
      termoBuscado: '',
    }
  }

  const { filtroAfiliacao, limite = 10, invokeFn } = opcoes

  try {
    const invoker = invokeFn ?? supabase.functions.invoke.bind(supabase.functions)

    const { data, error } = await invoker('scopus-buscar', {
      body: {
        termo: termoNormalizado,
        filtroAfiliacao: filtroAfiliacao ? normalizarNomeParaScopus(filtroAfiliacao) : undefined,
        limite,
      },
    })

    if (error) {
      return {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termoNormalizado,
        mensagemErro:
          error.message ||
          'Não foi possível consultar o serviço Scopus no momento. Tente novamente mais tarde.',
      }
    }

    if (!data) {
      return {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termoNormalizado,
        mensagemErro: 'Resposta vazia do servidor ao consultar o Scopus.',
      }
    }

    // Se o backend retornou sucesso: false (ex.: cota ou erro da Elsevier)
    if (data.sucesso === false) {
      return {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termoNormalizado,
        mensagemErro:
          data.mensagemErro ||
          'Erro ao consultar o serviço Scopus. Verifique os termos da busca e tente novamente.',
      }
    }

    return {
      sucesso: true,
      candidatos: Array.isArray(data.candidatos) ? data.candidatos : [],
      total: typeof data.total === 'number' ? data.total : 0,
      termoBuscado: termoNormalizado,
      mensagemErro: data.mensagemErro || undefined,
    }
  } catch (err: any) {
    return {
      sucesso: false,
      candidatos: [],
      total: 0,
      termoBuscado: termoNormalizado,
      mensagemErro:
        err?.message || 'Ocorreu uma falha de conexão ao comunicar com a função Scopus do backend.',
    }
  }
}
