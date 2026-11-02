import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  ANO_INICIO,
  ANO_FIM,
  NOTA_SIMPLIFICACAO_NP,
  NOTA_DISCIPLINAS_TEMPORAIS,
  avaliarDocenteLogica,
} from './logica.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Variáveis de ambiente do Supabase não configuradas na Edge Function.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const authHeader = req.headers.get('Authorization')
    const clientKey = supabaseServiceKey || supabaseAnonKey!

    const supabase = createClient(supabaseUrl, clientKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
    })

    // Leitura das tabelas relevantes (read-only)
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
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select(
          'id, nome, categoria, status, scopus_id, id_lattes, openalex_id, indice_h, bolsa_cnpq',
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
        .select('id, titulo, autores, periodico, ano, fator_impacto_jcr')
        .order('ano', { ascending: false }),
      supabase.from('publicacoes_docentes').select('id, publicacao_id, docente_id'),
      supabase
        .from('publicacoes_coautores_programa')
        .select('id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca'),
      supabase.from('disciplinas_docentes').select('disciplina_id, docente_id'),
    ])

    const erros = [
      docentesRes.error,
      orientacoesRes.error,
      disciplinasRes.error,
      projetosRes.error,
      participantesRes.error,
      publicacoesRes.error,
      publicacoesDocentesRes.error,
      coautoresRes.error,
      disciplinasDocentesRes.error,
    ].filter(Boolean)

    if (erros.length > 0) {
      console.error('[avaliacao-reconducao] erro ao consultar banco:', erros[0])
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: `Erro ao consultar tabelas para recondução: ${erros[0]?.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const docentes = docentesRes.data || []
    const orientacoes = orientacoesRes.data || []
    const vinculosDisciplinas = disciplinasDocentesRes.data || []
    const disciplinas = (disciplinasRes.data || []).map((d: any) => ({
      ...d,
      docentes_ids: vinculosDisciplinas
        .filter((v: any) => Number(v.disciplina_id) === Number(d.id))
        .map((v: any) => Number(v.docente_id)),
    }))
    const projetos = projetosRes.data || []
    const participantesProjetos = participantesRes.data || []
    const publicacoes = publicacoesRes.data || []
    const publicacoesDocentes = publicacoesDocentesRes.data || []
    const coautoresPrograma = coautoresRes.data || []

    const avaliacoes = docentes.map((docente: any) =>
      avaliarDocenteLogica({
        docente,
        orientacoes,
        disciplinas,
        projetos,
        participantesProjetos,
        publicacoes,
        publicacoesDocentes,
        coautoresPrograma,
        anoInicio: ANO_INICIO,
        anoFim: ANO_FIM,
      }),
    )

    let reconduzidos = 0
    let nao_atendem = 0
    let pdq_insuficiente = 0
    let nao_aplicavel = 0

    let total_permanentes = 0
    let total_colaboradores = 0
    let total_sem_categoria = 0

    for (const a of avaliacoes) {
      if (a.categoria === 'permanente') total_permanentes += 1
      else if (a.categoria === 'colaborador') total_colaboradores += 1
      else total_sem_categoria += 1

      if (a.veredito === 'RECONDUZIDO') reconduzidos += 1
      else if (a.veredito === 'PDQ_INSUFICIENTE') pdq_insuficiente += 1
      else if (a.veredito === 'NAO_ATENDE') nao_atendem += 1
      else nao_aplicavel += 1
    }

    const resposta = {
      sucesso: true,
      gerado_em: new Date().toISOString(),
      quadrienio: {
        ano_inicio: ANO_INICIO,
        ano_fim: ANO_FIM,
      },
      nota_metodologica: {
        criterio_iv_np_coautoria: NOTA_SIMPLIFICACAO_NP,
        criterio_ii_disciplinas_temporais: NOTA_DISCIPLINAS_TEMPORAIS,
      },
      resumo: {
        ano_inicio: ANO_INICIO,
        ano_fim: ANO_FIM,
        total_docentes: docentes.length,
        total_permanentes,
        total_colaboradores,
        total_sem_categoria,
        reconduzidos,
        nao_atendem,
        pdq_insuficiente,
        nao_aplicavel,
      },
      avaliacoes,
    }

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    console.error('[avaliacao-reconducao] erro inesperado:', err)
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: err?.message || 'Erro inesperado ao calcular avaliação de recondução.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})
