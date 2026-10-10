import { supabase } from '@/lib/supabase/client'
import type { RelatorioLacunasResposta } from '@/lib/lacunas/types'
import { consolidarRelatorioLacunas } from '@/lib/lacunas/regras'
import type {
  Docente,
  Discente,
  Publicacao,
  Orientacao,
  ProjetoPesquisa,
  Banca,
  Evento,
  Mobilidade,
  Patente,
  Premiacao,
  ProducaoTecnica,
} from '@/types/database'

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

  // Fallback seguro usando client padrão do Supabase para todas as 11 tabelas
  try {
    const [
      docentesRes,
      discentesRes,
      publicacoesRes,
      orientacoesRes,
      projetosRes,
      bancasRes,
      eventosRes,
      mobilidadeRes,
      patentesRes,
      premiacoesRes,
      producaoTecnicaRes,
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, scopus_id, openalex_id, id_lattes, indice_h, bolsa_cnpq, jdp, licenca')
        .order('nome', { ascending: true }),
      supabase
        .from('discentes')
        .select('id, nome, cpf, data_ingresso, status, link_lattes, link_comprovacao, observacoes')
        .order('nome', { ascending: true }),
      supabase
        .from('publicacoes')
        .select(
          'id, titulo, autores, periodico, ano, doi, justificativa, link_comprovacao, observacoes',
        )
        .order('ano', { ascending: false }),
      supabase
        .from('orientacoes')
        .select(
          'id, tipo, inicio, fim, status, docente_id, discente_id, link_comprovacao, observacoes',
        ),
      supabase
        .from('projetos_pesquisa')
        .select(
          'id, titulo, descricao, inicio, fim, financiamento, orgao_fomento, coordenador_id, link_comprovacao, observacoes',
        ),
      supabase
        .from('bancas')
        .select(
          'id, titulo_trabalho, data, membros, tipo, discente_id, link_comprovacao, observacoes',
        ),
      supabase
        .from('eventos')
        .select('id, docente, evento, local_data, papel, link_comprovacao, observacoes'),
      supabase
        .from('mobilidade_docente')
        .select(
          'id, tipo, nome, instituicao, periodo, modalidade, link, link_comprovacao, observacoes',
        ),
      supabase
        .from('patentes')
        .select('id, titulo, status, autores, inpi, link_comprovacao, observacoes'),
      supabase
        .from('premiacoes')
        .select('id, titulo, ano, nome_premiado, instituicao, link_comprovacao, observacoes'),
      supabase
        .from('producao_tecnica')
        .select('id, titulo, ano, autores, tipo, link_comprovacao, observacoes'),
    ])

    const erroEncontrado = [
      docentesRes.error,
      discentesRes.error,
      publicacoesRes.error,
      orientacoesRes.error,
      projetosRes.error,
      bancasRes.error,
      eventosRes.error,
      mobilidadeRes.error,
      patentesRes.error,
      premiacoesRes.error,
      producaoTecnicaRes.error,
    ].find(Boolean)

    if (erroEncontrado) {
      return {
        sucesso: false,
        mensagemErro: `Erro ao consultar tabelas para relatório de lacunas: ${erroEncontrado.message}`,
      }
    }

    const relatorio = consolidarRelatorioLacunas({
      docentes: (docentesRes.data || []) as unknown as Docente[],
      discentes: (discentesRes.data || []) as unknown as Discente[],
      publicacoes: (publicacoesRes.data || []) as unknown as Publicacao[],
      orientacoes: (orientacoesRes.data || []) as unknown as Orientacao[],
      projetos_pesquisa: (projetosRes.data || []) as unknown as ProjetoPesquisa[],
      bancas: (bancasRes.data || []) as unknown as Banca[],
      eventos: (eventosRes.data || []) as unknown as Evento[],
      mobilidade_docente: (mobilidadeRes.data || []) as unknown as Mobilidade[],
      patentes: (patentesRes.data || []) as unknown as Patente[],
      premiacoes: (premiacoesRes.data || []) as unknown as Premiacao[],
      producao_tecnica: (producaoTecnicaRes.data || []) as unknown as ProducaoTecnica[],
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
