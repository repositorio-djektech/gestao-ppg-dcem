import { supabase } from '@/lib/supabase/client'
import { ANO_INICIO, ANO_FIM } from '@/lib/reconducao/types'
import { calcularTodosIndicadores } from '@/lib/capes/indicadores'
import type { RelatorioIndicadoresCapes, DadosEntradaIndicadores } from '@/lib/capes/types'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
  Patente,
  Egresso,
  Discente,
  IniciacaoCientifica,
} from '@/types/database'

export interface ObterIndicadoresCapesOpcoes {
  anoReferencia?: number
  anoInicio?: number
  anoFim?: number
}

export interface ResultadoIndicadoresCapes {
  sucesso: boolean
  dados?: RelatorioIndicadoresCapes
  mensagemErro?: string
}

/**
 * Coletor 100% read-only das 10 tabelas em paralelo para alimentar o motor
 * de fórmulas da Ficha CAPES Engenharias II.
 *
 * Utiliza o mesmo padrão de concorrência com Promise.all adotado na Recondução.
 */
export async function obterIndicadoresCapes(
  opcoes: ObterIndicadoresCapesOpcoes = {},
): Promise<ResultadoIndicadoresCapes> {
  const {
    anoReferencia = new Date().getFullYear(),
    anoInicio = ANO_INICIO,
    anoFim = ANO_FIM,
  } = opcoes

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
      patentesRes,
      egressosRes,
      discentesRes,
      iniciacaoCientificaRes,
    ] = await Promise.all([
      // 1. Docentes
      supabase
        .from('docentes')
        .select(
          'id, nome, categoria, jdp, jdp_desde, ano_doutorado, indice_h, scopus_id, openalex_id, status, bolsa_cnpq',
        )
        .order('nome', { ascending: true }),

      // 2. Orientações
      supabase
        .from('orientacoes')
        .select(
          'id, tipo, inicio, fim, status, data_defesa, flag_orientador_principal, docente_id, discente_id',
        ),

      // 3. Disciplinas (com nível)
      supabase
        .from('disciplinas')
        .select('id, nome, codigo, creditos, ano_semestre, docente_id, nivel'),

      // 4. Projetos de Pesquisa
      supabase
        .from('projetos_pesquisa')
        .select('id, titulo, inicio, fim, financiamento, orgao_fomento, coordenador_id'),

      // 5. Projetos Participantes
      supabase.from('projetos_participantes').select('projeto_id, docente_id, papel'),

      // 6. Publicações (com estrato_qualis, tipo_producao, indicacao_nivel)
      supabase
        .from('publicacoes')
        .select(
          'id, titulo, autores, periodico, ano, fator_impacto_jcr, estrato_qualis, tipo_producao, indicacao_nivel, justificativa_indicacao',
        )
        .order('ano', { ascending: false }),

      // 7. Vínculos estruturados Docentes <-> Publicações
      (supabase.from as any)('publicacoes_docentes').select('id, publicacao_id, docente_id'),

      // 8. Coautores de Discentes/Egressos em Publicações
      (supabase.from as any)('publicacoes_coautores_programa').select(
        'id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca',
      ),

      // 9. Patentes (com âmbito e status)
      supabase
        .from('patentes')
        .select(
          'id, titulo, status, autores, inpi, created_at, link_comprovacao, observacoes, ambito',
        ),

      // 10. Egressos
      supabase
        .from('egressos')
        .select('id, nome, ano_titulacao, tipo_curso, docente_orientador_id'),

      // 11. Discentes
      supabase.from('discentes').select('id, nome, status, tipo_curso, docente_orientador_id'),

      // 12. Iniciação Científica (IC/IT)
      (supabase.from as any)('iniciacao_cientifica').select(
        'id, tipo, ano, discente_id, discente_nome, docente_orientador_id, projeto_id, titulo',
      ),
    ])

    const erro = [
      docentesRes.error,
      orientacoesRes.error,
      disciplinasRes.error,
      projetosRes.error,
      participantesRes.error,
      publicacoesRes.error,
      publicacoesDocentesRes.error,
      coautoresRes.error,
      patentesRes.error,
      egressosRes.error,
      discentesRes.error,
      iniciacaoCientificaRes.error,
    ].find(Boolean)

    if (erro) {
      return {
        sucesso: false,
        mensagemErro: `Erro na leitura dos dados para cálculo de indicadores: ${erro.message}`,
      }
    }

    const payloadEntrada: DadosEntradaIndicadores = {
      anoReferencia,
      anoInicio,
      anoFim,
      docentes: (docentesRes.data || []) as unknown as Docente[],
      orientacoes: (orientacoesRes.data || []) as unknown as Orientacao[],
      disciplinas: (disciplinasRes.data || []) as unknown as Disciplina[],
      projetos: (projetosRes.data || []) as unknown as ProjetoPesquisa[],
      projetosParticipantes: (participantesRes.data || []) as unknown as ProjetoParticipante[],
      publicacoes: (publicacoesRes.data || []) as unknown as Publicacao[],
      publicacoesDocentes: (publicacoesDocentesRes.data || []) as any[],
      publicacoesCoautores: (coautoresRes.data || []) as any[],
      patentes: (patentesRes.data || []) as unknown as Patente[],
      egressos: (egressosRes.data || []) as unknown as Egresso[],
      discentes: (discentesRes.data || []) as unknown as Discente[],
      iniciacoesCientificas: (iniciacaoCientificaRes.data ||
        []) as unknown as IniciacaoCientifica[],
    }

    const relatorio = calcularTodosIndicadores(payloadEntrada)

    return {
      sucesso: true,
      dados: relatorio,
    }
  } catch (err: any) {
    return {
      sucesso: false,
      mensagemErro: err?.message || 'Falha ao coletar dados para indicadores CAPES.',
    }
  }
}
