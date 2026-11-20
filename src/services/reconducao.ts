import { supabase } from '@/lib/supabase/client'
import type { RelatorioReconducaoResposta } from '@/lib/reconducao/types'
import { consolidarAvaliacaoReconducao } from '@/lib/reconducao/calculo'
import { janelaAvaliacaoDocente } from '@/lib/reconducao/calculo'
import { obterNotaCorte } from '@/services/notas-corte'
import { anexarDocentesNasDisciplinas } from '@/lib/disciplinas/docentes'
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
  /** Ano da avaliação (D-36): a janela é os 4 anos civis anteriores. Padrão: ano corrente. */
  anoAvaliacao?: number
  /** Janela explícita (sobrepõe a do ano da avaliação). */
  anoInicio?: number
  anoFim?: number
  /** Nota de corte do PDQ; sem ela, vale a cadastrada para o ano da avaliação (padrão 1,0). */
  notaCorte?: number
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
  const { invokeFn, executarLocal } = opcoes
  const anoAvaliacao = opcoes.anoAvaliacao ?? new Date().getFullYear()
  const janela = janelaAvaliacaoDocente(anoAvaliacao)
  const anoInicio = opcoes.anoInicio ?? janela.anoInicio
  const anoFim = opcoes.anoFim ?? janela.anoFim

  // 1. Tentar Edge Function primeiro, a menos que local seja explicitamente exigido
  if (!executarLocal) {
    try {
      const invoker = invokeFn ?? supabase.functions.invoke.bind(supabase.functions)
      const { data, error } = await invoker('avaliacao-reconducao', {
        body: {
          anoInicio,
          anoFim,
          anoAvaliacao,
          ...(opcoes.notaCorte !== undefined ? { notaCorte: opcoes.notaCorte } : {}),
        },
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
      publicacoesDocentesRes,
      coautoresRes,
      disciplinasDocentesRes,
      egressosRes,
      discentesRes,
      notasRes,
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select(
          'id, nome, categoria, status, scopus_id, id_lattes, openalex_id, indice_h, bolsa_cnpq, ingresso_ufs',
        )
        .order('nome', { ascending: true }),
      supabase
        .from('orientacoes')
        .select(
          'id, tipo, inicio, fim, status, cancelado, data_defesa, flag_orientador_principal, docente_id, discente_id',
        ),
      supabase.from('disciplinas').select('id, nome, codigo, creditos, ano_semestre, docente_id'),
      supabase
        .from('projetos_pesquisa')
        .select('id, titulo, inicio, fim, financiamento, orgao_fomento, coordenador_id'),
      supabase.from('projetos_participantes').select('projeto_id, docente_id, papel'),
      supabase
        .from('publicacoes')
        .select(
          'id, titulo, autores, periodico, ano, fator_impacto_jcr, estrato_qualis, tipo_producao, docente_atribuido_id',
        )
        .order('ano', { ascending: false }),
      (supabase.from as any)('publicacoes_docentes').select('id, publicacao_id, docente_id'),
      (supabase.from as any)('publicacoes_coautores_programa').select(
        'id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca',
      ),
      (supabase.from as any)('disciplinas_docentes').select('disciplina_id, docente_id'),
      (supabase.from as any)('egressos').select('id, ano_titulacao, docente_orientador_id'),
      (supabase.from as any)('discentes').select('id, docente_orientador_id'),
      (supabase.from as any)('avaliacao_notas_corte').select('ano_avaliacao, nota_corte'),
    ])

    const erroEncontrado = [
      docentesRes.error,
      orientacoesRes.error,
      disciplinasRes.error,
      projetosRes.error,
      participantesRes.error,
      publicacoesRes.error,
      publicacoesDocentesRes.error,
      coautoresRes.error,
      disciplinasDocentesRes.error,
      egressosRes.error,
      discentesRes.error,
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
      disciplinas: anexarDocentesNasDisciplinas(
        (disciplinasRes.data || []) as unknown as Disciplina[],
        (disciplinasDocentesRes.data || []) as any[],
      ),
      projetos: (projetosRes.data || []) as unknown as ProjetoPesquisa[],
      participantesProjetos: (participantesRes.data || []) as unknown as ProjetoParticipante[],
      publicacoes: (publicacoesRes.data || []) as unknown as Publicacao[],
      publicacoesDocentes: (publicacoesDocentesRes.data || []) as any[],
      coautoresPrograma: (coautoresRes.data || []) as any[],
      egressos: (egressosRes.data || []) as any[],
      discentes: (discentesRes.data || []) as any[],
      notasCortePorAno: Object.fromEntries(
        ((notasRes.data || []) as any[]).map((n) => [
          Number(n.ano_avaliacao),
          Number(n.nota_corte),
        ]),
      ),
      notaCorte: opcoes.notaCorte ?? (await obterNotaCorte(anoAvaliacao)),
      anoAvaliacao,
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
