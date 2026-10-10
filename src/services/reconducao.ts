import { supabase } from '@/lib/supabase/client'
import type { RelatorioReconducaoResposta } from '@/lib/reconducao/types'
import { consolidarAvaliacaoReconducao } from '@/lib/reconducao/calculo'
import { ANO_INICIO, ANO_FIM } from '@/lib/reconducao/types'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
} from '@/types/database'

export interface ObterAvaliacaoReconducaoOpcoes {
  /** Injeção de invoker para testes unitários */
  invokeFn?: (functionName: string, options?: { body?: any }) => Promise<{ data: any; error: any }>
  /** Força execução local direta contra o Supabase (fallback/offline) */
  executarLocal?: boolean
  anoInicio?: number
  anoFim?: number
}

export interface ResultadoAvaliacaoReconducao {
  sucesso: boolean
  dados?: RelatorioReconducaoResposta
  mensagemErro?: string
  origem?: 'edge_function' | 'local_fallback'
}

/**
 * Obtém o relatório e avaliação completa de recondução docente (Norma PPG-DCEM § 4º).
 * Tenta primariamente a Edge Function `avaliacao-reconducao`.
 * Em caso de indisponibilidade ou falha na Edge Function, realiza fallback transparente
 * executando o cálculo local com as mesmas regras puras TypeScript via Supabase client.
 *
 * Operação 100% read-only — nenhuma mutação no banco de dados.
 */
export async function obterAvaliacaoReconducao(
  opcoes: ObterAvaliacaoReconducaoOpcoes = {},
): Promise<ResultadoAvaliacaoReconducao> {
  const { invokeFn, executarLocal, anoInicio = ANO_INICIO, anoFim = ANO_FIM } = opcoes

  // 1. Tentar Edge Function primeiro, a menos que local seja explicitamente exigido
  if (!executarLocal) {
    try {
      const invoker = invokeFn ?? supabase.functions.invoke.bind(supabase.functions)
      const { data, error } = await invoker('avaliacao-reconducao', {
        body: { anoInicio, anoFim },
      })

      if (!error && data && data.sucesso && Array.isArray(data.avaliacoes) && data.resumo) {
        return {
          sucesso: true,
          dados: data as RelatorioReconducaoResposta,
          origem: 'edge_function',
        }
      }

      if (error) {
        console.warn(
          '[obterAvaliacaoReconducao] Edge function avaliacao-reconducao falhou, acionando fallback local:',
          error.message,
        )
      }
    } catch (edgeErr: any) {
      console.warn(
        '[obterAvaliacaoReconducao] Exceção na chamada da edge function, acionando fallback local:',
        edgeErr?.message,
      )
    }
  }

  // 2. Fallback local: lê dados com Supabase client e aplica cálculo compartilhado
  try {
    const [
      docentesRes,
      orientacoesRes,
      disciplinasRes,
      projetosRes,
      participantesRes,
      publicacoesRes,
      coautoresRes,
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, categoria, scopus_id, id_lattes, openalex_id, indice_h, bolsa_cnpq')
        .order('nome', { ascending: true }),
      supabase
        .from('orientacoes')
        .select(
          'id, tipo, inicio, fim, status, data_defesa, flag_orientador_principal, docente_id, discente_id',
        ),
      supabase.from('disciplinas').select('id, nome, codigo, creditos, ano_semestre, docente_id'),
      supabase
        .from('projetos_pesquisa')
        .select('id, titulo, inicio, fim, financiamento, orgao_fomento, coordenador_id'),
      supabase.from('projetos_participantes').select('projeto_id, docente_id, papel'),
      supabase
        .from('publicacoes')
        .select('id, titulo, autores, periodico, ano, fator_impacto_jcr')
        .order('ano', { ascending: false }),
      (supabase.from as any)('publicacoes_coautores_programa').select(
        'id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca',
      ),
    ])

    const erroEncontrado = [
      docentesRes.error,
      orientacoesRes.error,
      disciplinasRes.error,
      projetosRes.error,
      participantesRes.error,
      publicacoesRes.error,
      coautoresRes.error,
    ].find(Boolean)

    if (erroEncontrado) {
      return {
        sucesso: false,
        mensagemErro: `Erro ao consultar tabelas para recondução: ${erroEncontrado.message}`,
      }
    }

    const relatorio = consolidarAvaliacaoReconducao({
      docentes: (docentesRes.data || []) as unknown as Docente[],
      orientacoes: (orientacoesRes.data || []) as unknown as Orientacao[],
      disciplinas: (disciplinasRes.data || []) as unknown as Disciplina[],
      projetos: (projetosRes.data || []) as unknown as ProjetoPesquisa[],
      participantesProjetos: (participantesRes.data || []) as unknown as ProjetoParticipante[],
      publicacoes: (publicacoesRes.data || []) as unknown as Publicacao[],
      coautoresPrograma: (coautoresRes.data || []) as any[],
      anoInicio,
      anoFim,
    })

    return {
      sucesso: true,
      dados: relatorio,
      origem: 'local_fallback',
    }
  } catch (err: any) {
    return {
      sucesso: false,
      mensagemErro: err?.message || 'Falha ao consolidar dados de recondução localmente.',
    }
  }
}
