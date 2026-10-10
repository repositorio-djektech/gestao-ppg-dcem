import { ANO_INICIO, ANO_FIM, extrairAnoNumerico } from '../lattes/quadrienio'
import type {
  Docente,
  Orientacao,
  Disciplina,
  ProjetoPesquisa,
  ProjetoParticipante,
  Publicacao,
} from '@/types/database'
import type {
  AvaliacaoDocenteReconducao,
  CategoriaDocente,
  DetalhesPDQ,
  RelatorioReconducaoResposta,
  ResumoReconducao,
  VereditoReconducao,
} from './types'

export const NOTA_SIMPLIFICACAO_NP =
  'O NP estrito considera apenas publicações com fator de impacto JCR >= 1.0 com coautoria confirmada com orientandos ou egressos do P²CEM. Publicações ainda não confirmadas são apresentadas como potenciais no NP TETO para revisão pelo colegiado.'

export const NOTA_DISCIPLINAS_TEMPORAIS =
  'Quando a disciplina vinculada ao docente possui campo de ano/período (ano_semestre), valida-se a pertinência ao período (2025–2028). Caso o campo não contenha ano identificável, a disciplina vinculada é aceita como evidência de docência no programa e informada no detalhe.'

/**
 * Extrai ano de uma string de data (ex: '2025-11-20' -> 2025) ou de ano/período ('2025/1' -> 2025).
 */
export function extrairAnoDeData(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const str = String(valor).trim()

  // Formato ISO: YYYY-MM-DD ou YYYY-MM
  const matchIso = str.match(/^(\d{4})/)
  if (matchIso) {
    const ano = parseInt(matchIso[1], 10)
    if (!isNaN(ano) && ano > 0) return ano
  }

  // Formato com barra ou hífen: 2025/1, 2025-2
  const matchBarra = str.match(/\b(19\d\d|20\d\d)\b/)
  if (matchBarra) {
    const ano = parseInt(matchBarra[1], 10)
    if (!isNaN(ano) && ano > 0) return ano
  }

  return extrairAnoNumerico(valor)
}

/**
 * Verifica se um ano está dentro do quadriênio.
 */
export function anoNoPeriodo(ano: number | null, inicio = ANO_INICIO, fim = ANO_FIM): boolean {
  if (ano === null) return false
  return ano >= inicio && ano <= fim
}

/**
 * Extrai o ano de referência da orientação concluída usando data_defesa
 * com fallback para fim ou inicio.
 */
export function obterAnoOrientacaoDefesa(ori: Orientacao): number | null {
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

/**
 * Normaliza e verifica se a orientação está no período.
 */
export function orientacaoNoPeriodo(ori: Orientacao, inicio = ANO_INICIO, fim = ANO_FIM): boolean {
  const ano = obterAnoOrientacaoDefesa(ori)
  return anoNoPeriodo(ano, inicio, fim)
}

/**
 * Determina se uma orientação é de mestrado concluída.
 */
export function isMestradoConcluido(ori: Orientacao): boolean {
  const statusNorm = (ori.status || '').toLowerCase().trim()
  const tipoNorm = (ori.tipo || '').toLowerCase().trim()
  const concluido = statusNorm === 'concluido' || statusNorm === 'titulado'
  const mestrado = tipoNorm.includes('mestrado')
  return concluido && mestrado
}

/**
 * Determina se uma orientação é de doutorado concluída.
 */
export function isDoutoradoConcluido(ori: Orientacao): boolean {
  const statusNorm = (ori.status || '').toLowerCase().trim()
  const tipoNorm = (ori.tipo || '').toLowerCase().trim()
  const concluido = statusNorm === 'concluido' || statusNorm === 'titulado'
  const doutorado = tipoNorm.includes('doutorado')
  return concluido && doutorado
}

/**
 * Normaliza termos de busca de nome do docente para casar com campos de texto de autores.
 */
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

/**
 * Verifica se um texto de autores cita o docente.
 */
export function textoContemDocente(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (termos.length === 0) return false
  return termos.some((termo) => norm.includes(termo))
}

/**
 * Verifica se um projeto de pesquisa possui financiamento (flag boolean ou órgão de fomento preenchido).
 */
export function isProjetoFinanciado(proj: ProjetoPesquisa): boolean {
  if (proj.financiamento === true) return true
  const orgao = (proj.orgao_fomento || '').trim()
  return orgao.length > 0
}

/**
 * Verifica se um projeto de pesquisa abrange o quadriênio.
 * Se início ou fim estiverem vazios, considera compatível se houver data coerente.
 */
export function projetoNoPeriodo(
  proj: ProjetoPesquisa,
  inicio = ANO_INICIO,
  fim = ANO_FIM,
): boolean {
  const anoIni = extrairAnoDeData(proj.inicio)
  const anoFim = extrairAnoDeData(proj.fim)

  // Se ambos nulos, consideramos no período para não descartar sem evidência contrária
  if (anoIni === null && anoFim === null) return true

  // Se tem ano de início e ano de fim
  if (anoIni !== null && anoFim !== null) {
    return anoIni <= fim && anoFim >= inicio
  }

  // Apenas início: se iniciou até o fim do quadriênio
  if (anoIni !== null) {
    const fimStr = (proj.fim || '').toLowerCase()
    if (fimStr.includes('atual')) return anoIni <= fim
    return anoIni <= fim
  }

  // Apenas fim: se terminou após o início do quadriênio
  if (anoFim !== null) {
    return anoFim >= inicio
  }

  return true
}

/**
 * Calcula os detalhes do índice PDQ:
 * PDQ = NP / (MSc + DSc)
 * Pré-condição: (MSc + DSc) >= 2
 */
export function calcularPDQ(
  np: number,
  msc: number,
  dsc: number,
  np_teto?: number,
  np_pendente?: number,
): DetalhesPDQ {
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

export interface DadosParaAvaliacao {
  docente: Docente
  orientacoes: Orientacao[]
  disciplinas: Disciplina[]
  projetos: ProjetoPesquisa[]
  participantesProjetos: ProjetoParticipante[]
  publicacoes: Publicacao[]
  coautoresPrograma?: Array<{
    publicacao_id: number
    tipo: string
    nome_citado?: string
  }>
  anoInicio?: number
  anoFim?: number
}

/**
 * Avalia um único docente com relação à Norma de Recondução do PPG-DCEM (§ 4º).
 */
export function avaliarDocente(params: DadosParaAvaliacao): AvaliacaoDocenteReconducao {
  const {
    docente,
    orientacoes,
    disciplinas,
    projetos,
    participantesProjetos,
    publicacoes,
    anoInicio = ANO_INICIO,
    anoFim = ANO_FIM,
  } = params

  const termosNome = extrairTermosDocente(docente.nome)
  const categoria: CategoriaDocente = docente.categoria || null

  // --------------------------------------------------------------------------
  // CRITÉRIO I: Orientaram alunos no P²CEM como orientador principal
  // --------------------------------------------------------------------------
  const orientacoesDoDocente = orientacoes.filter((ori) => ori.docente_id === docente.id)

  const orientacoesPrincipaisNoPeriodo = orientacoesDoDocente.filter((ori) => {
    const isPrincipal = ori.flag_orientador_principal === true
    const noPeriodo = orientacaoNoPeriodo(ori, anoInicio, anoFim)
    return isPrincipal && noPeriodo
  })

  const critI_atendido = orientacoesPrincipaisNoPeriodo.length > 0
  const criterio_i = {
    atendido: critI_atendido,
    quantidade: orientacoesPrincipaisNoPeriodo.length,
    detalhe: critI_atendido
      ? `${orientacoesPrincipaisNoPeriodo.length} orientação(ões) como orientador principal no quadriênio (${anoInicio}–${anoFim}).`
      : `Nenhuma orientação como orientador principal registrada no quadriênio (${anoInicio}–${anoFim}).`,
    itens: orientacoesPrincipaisNoPeriodo,
  }

  // --------------------------------------------------------------------------
  // CRITÉRIO II: Ministraram disciplinas no P²CEM
  // --------------------------------------------------------------------------
  const disciplinasDoDocente = disciplinas.filter((disc) => disc.docente_id === docente.id)

  // Filtro temporal em disciplinas
  const disciplinasNoPeriodo = disciplinasDoDocente.filter((disc) => {
    const ano = extrairAnoDeData(disc.ano_semestre)
    if (ano !== null) {
      return anoNoPeriodo(ano, anoInicio, anoFim)
    }
    // Se não tiver campo temporal interpretável, aceita como vinculada
    return true
  })

  const critII_atendido = disciplinasNoPeriodo.length > 0
  const criterio_ii = {
    atendido: critII_atendido,
    quantidade: disciplinasNoPeriodo.length,
    detalhe: critII_atendido
      ? `${disciplinasNoPeriodo.length} disciplina(s) vinculada(s) ao docente no programa no quadriênio (${anoInicio}–${anoFim}).`
      : `Nenhuma disciplina vinculada ao docente registrada no programa no período.`,
    itens: disciplinasNoPeriodo,
  }

  // --------------------------------------------------------------------------
  // CRITÉRIO III: Participaram de projetos com financiamento
  // O docente pode ser:
  // (a) participante via tabela projetos_participantes de projeto financiado no período
  // (b) coordenador (coordenador_id) de projeto financiado no período
  // --------------------------------------------------------------------------
  const projetosMap = new Map<number, ProjetoPesquisa>()
  for (const p of projetos) {
    projetosMap.set(p.id, p)
  }

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
    itens: projetosFinanciadosNoPeriodo,
  }

  // --------------------------------------------------------------------------
  // CRITÉRIO IV: PDQ = NP / (MSc + DSc) >= 1.0 com (MSc + DSc) >= 2
  // --------------------------------------------------------------------------
  // MSc: orientações de mestrado CONCLUÍDAS no período com docente orientador
  const mscConcluidos = orientacoesDoDocente.filter((ori) => {
    return isMestradoConcluido(ori) && orientacaoNoPeriodo(ori, anoInicio, anoFim)
  })
  const msc = mscConcluidos.length

  // DSc: orientações de doutorado CONCLUÍDAS no período com docente orientador
  const dscConcluidos = orientacoesDoDocente.filter((ori) => {
    return isDoutoradoConcluido(ori) && orientacaoNoPeriodo(ori, anoInicio, anoFim)
  })
  const dsc = dscConcluidos.length

  // Mapa de confirmações de coautoria por publicação
  // Tipos: 'orientando' ou 'egresso' (confirmado com coautoria) | 'sem_coautoria' (marcado expressamente sem)
  const coautores = params.coautoresPrograma || []
  const mapaCoautoria = new Map<
    number,
    { temCoautoria: boolean; semCoautoria: boolean; nomes: string[] }
  >()
  for (const c of coautores) {
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

  // Todas as publicações JCR >= 1.0 do docente no período (NP TETO)
  const publicacoesDocenteNoPeriodo = publicacoes.filter((pub) => {
    const noPeriodo = anoNoPeriodo(pub.ano, anoInicio, anoFim)
    if (!noPeriodo) return false

    // Autor corresponde ao docente
    const pertenceAoDocente = textoContemDocente(pub.autores, termosNome)
    if (!pertenceAoDocente) return false

    // JCR >= 1.0
    const jcr =
      pub.fator_impacto_jcr !== null && pub.fator_impacto_jcr !== undefined
        ? Number(pub.fator_impacto_jcr)
        : null
    return jcr !== null && !isNaN(jcr) && jcr >= 1.0
  })

  // Classifica as publicações segundo o status de coautoria:
  // - confirmadas: possuem registro de coautoria do programa ('orientando' ou 'egresso')
  // - sem_coautoria: expressamente marcadas como 'sem_coautoria'
  // - pendentes: sem registro de confirmação ainda
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

  // Regra estrita: conta apenas as confirmadas
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

  // --------------------------------------------------------------------------
  // DETERMINAÇÃO DO VEREDITO E MOTIVOS
  // --------------------------------------------------------------------------
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

  let veredito: VereditoReconducao

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

/**
 * Consolida a avaliação de recondução de todos os docentes fornecidos.
 */
export function consolidarAvaliacaoReconducao(params: {
  docentes: Docente[]
  orientacoes: Orientacao[]
  disciplinas: Disciplina[]
  projetos: ProjetoPesquisa[]
  participantesProjetos: ProjetoParticipante[]
  publicacoes: Publicacao[]
  coautoresPrograma?: Array<{
    publicacao_id: number
    tipo: string
    nome_citado?: string
  }>
  anoInicio?: number
  anoFim?: number
}): RelatorioReconducaoResposta {
  const {
    docentes,
    orientacoes,
    disciplinas,
    projetos,
    participantesProjetos,
    publicacoes,
    coautoresPrograma = [],
    anoInicio = ANO_INICIO,
    anoFim = ANO_FIM,
  } = params

  const avaliacoes: AvaliacaoDocenteReconducao[] = docentes.map((docente) =>
    avaliarDocente({
      docente,
      orientacoes,
      disciplinas,
      projetos,
      participantesProjetos,
      publicacoes,
      coautoresPrograma,
      anoInicio,
      anoFim,
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
    if (a.categoria === 'permanente') {
      total_permanentes += 1
    } else if (a.categoria === 'colaborador') {
      total_colaboradores += 1
    } else {
      total_sem_categoria += 1
    }

    if (a.veredito === 'RECONDUZIDO') {
      reconduzidos += 1
    } else if (a.veredito === 'PDQ_INSUFICIENTE') {
      pdq_insuficiente += 1
    } else if (a.veredito === 'NAO_ATENDE') {
      nao_atendem += 1
    } else {
      nao_aplicavel += 1
    }
  }

  const resumo: ResumoReconducao = {
    ano_inicio: anoInicio,
    ano_fim: anoFim,
    total_docentes: docentes.length,
    total_permanentes,
    total_colaboradores,
    total_sem_categoria,
    reconduzidos,
    nao_atendem,
    pdq_insuficiente,
    nao_aplicavel,
  }

  return {
    sucesso: true,
    gerado_em: new Date().toISOString(),
    quadrienio: {
      ano_inicio: anoInicio,
      ano_fim: anoFim,
    },
    nota_metodologica: {
      criterio_iv_np_coautoria: NOTA_SIMPLIFICACAO_NP,
      criterio_ii_disciplinas_temporais: NOTA_DISCIPLINAS_TEMPORAIS,
    },
    resumo,
    avaliacoes,
  }
}
