import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { aplicarCiclo, resumirAvaliacoes, janelaAvaliacaoDocente } from './pdq.ts'
import {
  autenticarChamador,
  respostaNegada,
  restringirAvaliacoesAoDocente,
} from '../_shared/auth.ts'
import {
  NOTA_CORTE_PADRAO,
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

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
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

    // P-38: só responde a usuário autenticado com perfil. Antes, sem o cabeçalho Authorization a
    // consulta caía na chave de serviço e devolvia tudo a qualquer chamada anônima.
    const authHeader = req.headers.get('Authorization')
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const acesso = await autenticarChamador({
      authHeader,
      buscarUsuario: async (header) => {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: header } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data, error } = await userClient.auth.getUser()
        return error || !data?.user ? null : { id: data.user.id }
      },
      buscarPerfil: async (userId) => {
        const { data } = await adminClient
          .from('profiles')
          .select('role, docente_id')
          .eq('user_id', userId)
          .maybeSingle()
        return data
      },
    })
    if (!acesso.ok) return respostaNegada(acesso, corsHeaders)

    // Os dados são lidos como o próprio usuário (a RLS vale), nunca com a chave de serviço
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader as string } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Avaliação do docente (D-36): janela dos 4 anos civis anteriores ao ano da avaliação.
    // Vale, nesta ordem: anoInicio/anoFim da requisição; anoAvaliacao da requisição; ano corrente.
    const anoValido = (v: unknown): number | null =>
      typeof v === 'number' && Number.isInteger(v) && v >= 1990 && v <= 2100 ? v : null
    let corpo: any = null
    try {
      corpo = await req.json()
    } catch {
      corpo = null
    }
    let ANO_INICIO = anoValido(corpo?.anoInicio)
    let ANO_FIM = anoValido(corpo?.anoFim)
    let anoAvaliacao = anoValido(corpo?.anoAvaliacao)
    if (ANO_INICIO === null || ANO_FIM === null || ANO_INICIO > ANO_FIM) {
      const ano = anoAvaliacao ?? new Date().getFullYear()
      anoAvaliacao = ano
      ANO_INICIO = ano - 4
      ANO_FIM = ano - 1
    }
    if (anoAvaliacao === null) anoAvaliacao = ANO_FIM + 1

    // Nota de corte do ano da avaliação: da requisição, senão da tabela, senão 1,0
    let notaCorte: number = NOTA_CORTE_PADRAO
    const notaReq = Number(corpo?.notaCorte)
    if (corpo?.notaCorte !== undefined && Number.isFinite(notaReq) && notaReq >= 0) {
      notaCorte = notaReq
    } else {
      const { data: linhaNota } = await supabase
        .from('avaliacao_notas_corte')
        .select('nota_corte')
        .eq('ano_avaliacao', anoAvaliacao)
        .maybeSingle()
      const notaBanco = Number(linhaNota?.nota_corte)
      if (linhaNota && Number.isFinite(notaBanco)) notaCorte = notaBanco
    }

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
      supabase.from('publicacoes_docentes').select('id, publicacao_id, docente_id'),
      supabase
        .from('publicacoes_coautores_programa')
        .select('id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca'),
      supabase.from('disciplinas_docentes').select('disciplina_id, docente_id'),
      supabase.from('egressos').select('id, ano_titulacao, docente_orientador_id'),
      supabase.from('discentes').select('id, docente_orientador_id'),
      supabase.from('avaliacao_notas_corte').select('ano_avaliacao, nota_corte'),
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
      egressosRes.error,
      discentesRes.error,
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
    const egressos = egressosRes.data || []
    const discentes = discentesRes.data || []
    // Nota de corte de cada ano (para refazer as avaliações do ciclo); falha de leitura = usa a do ano atual
    const notasCortePorAno: Record<number, number> = {}
    for (const n of notasRes.data || []) {
      const v = Number(n.nota_corte)
      if (Number.isFinite(v)) notasCortePorAno[Number(n.ano_avaliacao)] = v
    }

    const base = {
      orientacoes,
      disciplinas,
      projetos,
      participantesProjetos,
      publicacoes,
      publicacoesDocentes,
      coautoresPrograma,
      egressos,
      discentes,
    }
    const avaliacoes = docentes.map((docente: any) =>
      avaliarDocenteLogica({
        docente,
        ...base,
        notaCorte,
        anoInicio: ANO_INICIO,
        anoFim: ANO_FIM,
      }),
    )

    // Art. 11, §4º: refaz as avaliações do ciclo de 4 anos de colaboradores e visitantes
    aplicarCiclo(avaliacoes as any[], anoAvaliacao, (docenteId, ano) => {
      const docente = docentes.find((d: any) => Number(d.id) === docenteId)
      if (!docente) return true
      const j = janelaAvaliacaoDocente(ano)
      const r = avaliarDocenteLogica({
        docente,
        ...base,
        notaCorte: notasCortePorAno[ano] ?? notaCorte,
        anoInicio: j.anoInicio,
        anoFim: j.anoFim,
      })
      return (
        r.criterio_i.atendido &&
        r.criterio_ii.atendido &&
        r.criterio_iii.atendido &&
        r.criterio_iv.atendido
      )
    })

    const { totais, limite } = resumirAvaliacoes(avaliacoes)

    const resposta = {
      sucesso: true,
      gerado_em: new Date().toISOString(),
      quadrienio: {
        ano_inicio: ANO_INICIO,
        ano_fim: ANO_FIM,
      },
      avaliacao: {
        ano_avaliacao: anoAvaliacao,
        ano_inicio: ANO_INICIO,
        ano_fim: ANO_FIM,
        nota_corte: notaCorte,
      },
      nota_metodologica: {
        criterio_iv_np_coautoria: NOTA_SIMPLIFICACAO_NP,
        criterio_ii_disciplinas_temporais: NOTA_DISCIPLINAS_TEMPORAIS,
      },
      limite_colaboradores: limite,
      resumo: {
        ano_inicio: ANO_INICIO,
        ano_fim: ANO_FIM,
        ...totais,
      },
      // D-25: o docente vê os cards gerais, mas só a própria avaliação na lista
      avaliacoes: restringirAvaliacoesAoDocente(avaliacoes, acesso.perfil),
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
