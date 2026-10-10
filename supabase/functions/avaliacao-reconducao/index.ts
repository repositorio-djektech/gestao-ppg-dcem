import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Constantes do quadriênio centralizado (2025-2028)
export const ANO_INICIO = 2025
export const ANO_FIM = 2028

export const NOTA_SIMPLIFICACAO_NP =
  'O NP estrito considera apenas publicações com fator de impacto JCR >= 1.0 com coautoria confirmada com orientandos ou egressos do P²CEM. Publicações ainda não confirmadas são apresentadas como potenciais no NP TETO para revisão pelo colegiado.'

export const NOTA_DISCIPLINAS_TEMPORAIS =
  'Quando a disciplina vinculada ao docente possui campo de ano/período (ano_semestre), valida-se a pertinência ao período (2025–2028). Caso o campo não contenha ano identificável, a disciplina vinculada é aceita como evidência de docência no programa e informada no detalhe.'

export function extrairAnoDeData(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const str = String(valor).trim()

  const matchIso = str.match(/^(\d{4})/)
  if (matchIso) {
    const ano = parseInt(matchIso[1], 10)
    if (!isNaN(ano) && ano > 0) return ano
  }

  const matchBarra = str.match(/\b(19\d\d|20\d\d)\b/)
  if (matchBarra) {
    const ano = parseInt(matchBarra[1], 10)
    if (!isNaN(ano) && ano > 0) return ano
  }

  const num = typeof valor === 'number' ? valor : parseInt(str, 10)
  if (isNaN(num) || num <= 0) return null
  return num
}

export function anoNoPeriodo(ano: number | null, inicio = ANO_INICIO, fim = ANO_FIM): boolean {
  if (ano === null) return false
  return ano >= inicio && ano <= fim
}

export function obterAnoOrientacaoDefesa(ori: any): number | null {
  if (ori.data_defesa) {
    const anoDefesa = extrairAnoDeData(ori.data_defesa)
    if (anoDefesa !== null) return anoDefesa
  }
  if (ori.fim) {
    const anoFim = extrairAnoDeData(ori.fim)
    if (anoFim !== null) return anoFim
  }
  if (ori.inicio) {
    const anoInicio = extrairAnoDeData(ori.inicio)
    if (anoInicio !== null) return anoInicio
  }
  return null
}

export function extrairTermosDocente(nome: string): string[] {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (p) =>
        p.length > 2 && !['dr', 'dra', 'prof', 'profa', 'dos', 'das', 'da', 'de', 'do'].includes(p),
    )
}

export function textoContemDocente(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (termos.length === 0) return false
  return termos.some((termo) => norm.includes(termo))
}

export function isProjetoFinanciado(proj: any): boolean {
  if (proj.financiamento === true) return true
  const orgao = (proj.orgao_fomento || '').trim()
  return orgao.length > 0
}

export function projetoNoPeriodo(proj: any, inicio = ANO_INICIO, fim = ANO_FIM): boolean {
  const anoIni = extrairAnoDeData(proj.inicio)
  const anoFim = extrairAnoDeData(proj.fim)

  if (anoIni === null && anoFim === null) return true
  if (anoIni !== null && anoFim !== null) {
    return anoIni <= fim && anoFim >= inicio
  }
  if (anoIni !== null) {
    return anoIni <= fim
  }
  if (anoFim !== null) {
    return anoFim >= inicio
  }
  return true
}

export function calcularPDQ(
  np: number,
  msc: number,
  dsc: number,
  np_teto?: number,
  np_pendente?: number,
) {
  const titulacoes_total = msc + dsc
  const precondicao_atendida = titulacoes_total >= 2

  if (!precondicao_atendida) {
    return {
      np,
      np_teto: np_teto ?? np,
      np_pendente: np_pendente ?? 0,
      msc,
      dsc,
      titulacoes_total,
      precondicao_atendida: false,
      pdq: null,
      meta_atingida: false,
      observacao_simplificacao_coautoria: NOTA_SIMPLIFICACAO_NP,
    }
  }

  const pdqCalculado = Number((np / titulacoes_total).toFixed(3))
  const meta_atingida = pdqCalculado >= 1.0

  return {
    np,
    np_teto: np_teto ?? np,
    np_pendente: np_pendente ?? 0,
    msc,
    dsc,
    titulacoes_total,
    precondicao_atendida: true,
    pdq: pdqCalculado,
    meta_atingida,
    observacao_simplificacao_coautoria: NOTA_SIMPLIFICACAO_NP,
  }
}

export function avaliarDocenteLogica(params: {
  docente: any
  orientacoes: any[]
  disciplinas: any[]
  projetos: any[]
  participantesProjetos: any[]
  publicacoes: any[]
  coautoresPrograma?: any[]
  anoInicio?: number
  anoFim?: number
}) {
  const {
    docente,
    orientacoes,
    disciplinas,
    projetos,
    participantesProjetos,
    publicacoes,
    coautoresPrograma = [],
    anoInicio = ANO_INICIO,
    anoFim = ANO_FIM,
  } = params

  const termosNome = extrairTermosDocente(docente.nome)
  const categoria = docente.categoria || null

  // 1. Critério I: Orientador principal de alunos no programa no quadriênio
  const orientacoesDoDocente = orientacoes.filter((ori) => ori.docente_id === docente.id)
  const orientacoesPrincipaisNoPeriodo = orientacoesDoDocente.filter((ori) => {
    const isPrincipal = ori.flag_orientador_principal === true
    const ano = obterAnoOrientacaoDefesa(ori)
    const noPeriodo = anoNoPeriodo(ano, anoInicio, anoFim)
    return isPrincipal && noPeriodo
  })

  const critI_atendido = orientacoesPrincipaisNoPeriodo.length > 0
  const criterio_i = {
    atendido: critI_atendido,
    quantidade: orientacoesPrincipaisNoPeriodo.length,
    detalhe: critI_atendido
      ? `${orientacoesPrincipaisNoPeriodo.length} orientação(ões) como orientador principal no quadriênio (${anoInicio}–${anoFim}).`
      : `Nenhuma orientação como orientador principal registrada no quadriênio (${anoInicio}–${anoFim}).`,
  }

  // 2. Critério II: Ministrou disciplinas no programa
  const disciplinasDoDocente = disciplinas.filter((disc) => disc.docente_id === docente.id)
  const disciplinasNoPeriodo = disciplinasDoDocente.filter((disc) => {
    const ano = extrairAnoDeData(disc.ano_semestre)
    if (ano !== null) {
      return anoNoPeriodo(ano, anoInicio, anoFim)
    }
    return true
  })

  const critII_atendido = disciplinasNoPeriodo.length > 0
  const criterio_ii = {
    atendido: critII_atendido,
    quantidade: disciplinasNoPeriodo.length,
    detalhe: critII_atendido
      ? `${disciplinasNoPeriodo.length} disciplina(s) vinculada(s) ao docente no programa no quadriênio (${anoInicio}–${anoFim}).`
      : `Nenhuma disciplina vinculada ao docente registrada no programa no período.`,
  }

  // 3. Critério III: Projetos com financiamento no quadriênio
  const idsProjetosParticipante = new Set<number>()
  for (const part of participantesProjetos) {
    if (part.docente_id === docente.id) {
      idsProjetosParticipante.add(part.projeto_id)
    }
  }

  const projetosDocente = projetos.filter((proj) => {
    const isCoordenador = proj.coordenador_id === docente.id
    const isParticipante = idsProjetosParticipante.has(proj.id)
    return isCoordenador || isParticipante
  })

  const projetosFinanciadosNoPeriodo = projetosDocente.filter((proj) => {
    const financiado = isProjetoFinanciado(proj)
    const noPeriodo = projetoNoPeriodo(proj, anoInicio, anoFim)
    return financiado && noPeriodo
  })

  const critIII_atendido = projetosFinanciadosNoPeriodo.length > 0
  const criterio_iii = {
    atendido: critIII_atendido,
    quantidade: projetosFinanciadosNoPeriodo.length,
    detalhe: critIII_atendido
      ? `${projetosFinanciadosNoPeriodo.length} projeto(s) com financiamento no quadriênio (${anoInicio}–${anoFim}).`
      : `Nenhum projeto com financiamento identificado no quadriênio (${anoInicio}–${anoFim}).`,
  }

  // 4. Critério IV: PDQ = NP / (MSc + DSc) >= 1.0 com (MSc + DSc) >= 2
  const mscConcluidos = orientacoesDoDocente.filter((ori) => {
    const status = (ori.status || '').toLowerCase().trim()
    const tipo = (ori.tipo || '').toLowerCase().trim()
    const isConcluido = status === 'concluido' || status === 'titulado'
    const isMestrado = tipo.includes('mestrado')
    const ano = obterAnoOrientacaoDefesa(ori)
    return isConcluido && isMestrado && anoNoPeriodo(ano, anoInicio, anoFim)
  })
  const msc = mscConcluidos.length

  const dscConcluidos = orientacoesDoDocente.filter((ori) => {
    const status = (ori.status || '').toLowerCase().trim()
    const tipo = (ori.tipo || '').toLowerCase().trim()
    const isConcluido = status === 'concluido' || status === 'titulado'
    const isDoutorado = tipo.includes('doutorado')
    const ano = obterAnoOrientacaoDefesa(ori)
    return isConcluido && isDoutorado && anoNoPeriodo(ano, anoInicio, anoFim)
  })
  const dsc = dscConcluidos.length

  const mapaCoautoria = new Map<
    number,
    { temCoautoria: boolean; semCoautoria: boolean; nomes: string[] }
  >()
  for (const c of coautoresPrograma) {
    const entry = mapaCoautoria.get(c.publicacao_id) || {
      temCoautoria: false,
      semCoautoria: false,
      nomes: [],
    }
    if (c.tipo === 'orientando' || c.tipo === 'egresso') {
      entry.temCoautoria = true
      if (c.nome_citado) entry.nomes.push(c.nome_citado)
    } else if (c.tipo === 'sem_coautoria') {
      entry.semCoautoria = true
    }
    mapaCoautoria.set(c.publicacao_id, entry)
  }

  const publicacoesDocenteNoPeriodo = publicacoes.filter((pub) => {
    if (!anoNoPeriodo(pub.ano, anoInicio, anoFim)) return false
    if (!textoContemDocente(pub.autores, termosNome)) return false
    const jcr =
      pub.fator_impacto_jcr !== null && pub.fator_impacto_jcr !== undefined
        ? Number(pub.fator_impacto_jcr)
        : null
    return jcr !== null && !isNaN(jcr) && jcr >= 1.0
  })

  const confirmadasList: any[] = []
  const pendentesList: any[] = []
  const semCoautoriaList: any[] = []

  for (const pub of publicacoesDocenteNoPeriodo) {
    const st = mapaCoautoria.get(pub.id)
    if (st?.temCoautoria) {
      confirmadasList.push({
        ...pub,
        status_coautoria: 'confirmado',
        coautores_programa_nomes: st.nomes,
      })
    } else if (st?.semCoautoria) {
      semCoautoriaList.push({
        ...pub,
        status_coautoria: 'sem_coautoria',
      })
    } else {
      pendentesList.push({
        ...pub,
        status_coautoria: 'pendente',
      })
    }
  }

  const np = confirmadasList.length
  const np_teto = publicacoesDocenteNoPeriodo.length
  const np_pendente = pendentesList.length

  const pdq_detalhes = calcularPDQ(np, msc, dsc, np_teto, np_pendente)
  const critIV_atendido = pdq_detalhes.meta_atingida

  let detalheCritIV = ''
  if (!pdq_detalhes.precondicao_atendida) {
    detalheCritIV = `Não atingiu o mínimo de 2 titulações concluídas no período (MSc + DSc = ${pdq_detalhes.titulacoes_total}). PDQ indefinido/insuficiente.`
  } else if (pdq_detalhes.meta_atingida) {
    detalheCritIV = `PDQ ${pdq_detalhes.pdq} atinge a meta mínima (>= 1.0). NP=${np} confirmada(s) (teto: ${np_teto}, pendentes: ${np_pendente}), MSc=${msc}, DSc=${dsc}.`
  } else {
    detalheCritIV = `PDQ ${pdq_detalhes.pdq} abaixo da meta mínima (>= 1.0). NP=${np} confirmada(s) (teto: ${np_teto}, pendentes: ${np_pendente}), MSc=${msc}, DSc=${dsc}.`
  }

  const criterio_iv = {
    atendido: critIV_atendido,
    quantidade: np,
    detalhe: detalheCritIV,
    itens: confirmadasList,
  }

  // Motivos e Veredito
  const motivos: string[] = []
  if (!critI_atendido) {
    motivos.push(
      `Critério I não atendido: nenhuma orientação como orientador principal registrada no período (${anoInicio}–${anoFim}).`,
    )
  }
  if (!critII_atendido) {
    motivos.push(
      `Critério II não atendido: nenhuma disciplina vinculada ao docente registrada no programa no período.`,
    )
  }
  if (!critIII_atendido) {
    motivos.push(
      `Critério III não atendido: nenhuma participação em projeto de pesquisa financiado no período.`,
    )
  }
  if (!pdq_detalhes.precondicao_atendida) {
    motivos.push(
      `Critério IV não atendido: não atingiu o mínimo de 2 titulações concluídas no período (MSc + DSc = ${pdq_detalhes.titulacoes_total} < 2).`,
    )
  } else if (!pdq_detalhes.meta_atingida) {
    motivos.push(`Critério IV não atendido: índice PDQ (${pdq_detalhes.pdq}) inferior a 1,0.`)
  }

  let veredito = 'NAO_APLICAVEL'
  if (categoria !== 'permanente') {
    veredito = 'NAO_APLICAVEL'
    if (motivos.length === 0) {
      motivos.push(
        `Docente da categoria '${categoria || 'não definida'}' atende aos índices, mas a recondução automática do § 4º é restrita a docentes da categoria permanente.`,
      )
    } else {
      motivos.unshift(
        `A recondução do § 4º aplica-se exclusivamente a docentes da categoria permanente (categoria atual: '${categoria || 'não definida'}').`,
      )
    }
  } else {
    const todosAtendidos = critI_atendido && critII_atendido && critIII_atendido && critIV_atendido
    if (todosAtendidos) {
      veredito = 'RECONDUZIDO'
    } else if (!pdq_detalhes.precondicao_atendida) {
      veredito = 'PDQ_INSUFICIENTE'
    } else {
      veredito = 'NAO_ATENDE'
    }
  }

  return {
    docente_id: docente.id,
    nome: docente.nome,
    categoria,
    scopus_id: docente.scopus_id || null,
    id_lattes: docente.id_lattes || null,
    criterio_i,
    criterio_ii,
    criterio_iii,
    criterio_iv,
    pdq_detalhes,
    np_estrito: np,
    np_teto,
    publicacoes_confirmadas: confirmadasList,
    publicacoes_pendentes: pendentesList,
    publicacoes_sem_coautoria: semCoautoriaList,
    veredito,
    motivos,
  }
}

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
      supabase
        .from('publicacoes_coautores_programa')
        .select('id, publicacao_id, discente_id, egresso_id, tipo, nome_citado, grau_confianca'),
    ])

    const erros = [
      docentesRes.error,
      orientacoesRes.error,
      disciplinasRes.error,
      projetosRes.error,
      participantesRes.error,
      publicacoesRes.error,
      coautoresRes.error,
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
    const disciplinas = disciplinasRes.data || []
    const projetos = projetosRes.data || []
    const participantesProjetos = participantesRes.data || []
    const publicacoes = publicacoesRes.data || []
    const coautoresPrograma = coautoresRes.data || []

    const avaliacoes = docentes.map((docente: any) =>
      avaliarDocenteLogica({
        docente,
        orientacoes,
        disciplinas,
        projetos,
        participantesProjetos,
        publicacoes,
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
