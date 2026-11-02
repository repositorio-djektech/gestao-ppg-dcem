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
  if (termos.length === 0) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  // Exige >= 2 termos do nome (ou o único, se só houver um): sobrenome comum isolado não casa.
  const minimo = Math.min(2, termos.length)
  return termos.filter((termo) => norm.includes(termo)).length >= minimo
}

// Ids dos docentes de uma disciplina: N:N (docentes_ids) + docente_id legado.
export function idsDocentesDaDisciplina(d: any): number[] {
  const ids = new Set<number>()
  for (const id of d.docentes_ids ?? []) {
    const n = Number(id)
    if (n) ids.add(n)
  }
  if (d.docente_id) ids.add(Number(d.docente_id))
  return [...ids]
}

// --- Status efetivo da orientação ---
// Cópia de src/lib/orientacoes/status.ts (a função não importa de src/). Mantida em paridade
// por logica.paridade.test.ts; ao alterar um lado, altere o outro.
export function parseDataFimOrientacao(fim: unknown): Date | null {
  if (fim === null || fim === undefined) return null
  const str = String(fim).trim()
  if (!str) return null

  // 1. YYYY-MM-DD
  const mIso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (mIso) {
    const year = parseInt(mIso[1], 10)
    const month = parseInt(mIso[2], 10)
    const day = parseInt(mIso[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
    return null
  }

  // 2. DD/MM/YYYY
  const mBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (mBr) {
    const day = parseInt(mBr[1], 10)
    const month = parseInt(mBr[2], 10)
    const year = parseInt(mBr[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
    return null
  }

  // 3. MM/YYYY ou MM-YYYY -> último dia do mês
  const mMmYyyy = str.match(/^(\d{2})[/-](\d{4})$/)
  if (mMmYyyy) {
    const month = parseInt(mMmYyyy[1], 10)
    const year = parseInt(mMmYyyy[2], 10)
    if (month >= 1 && month <= 12) {
      // Dia 0 do mês seguinte é o último dia do mês desejado
      const d = new Date(year, month, 0, 12, 0, 0)
      return d
    }
    return null
  }

  // 4. YYYY-MM -> último dia do mês
  const mYyyyMm = str.match(/^(\d{4})-(\d{2})$/)
  if (mYyyyMm) {
    const year = parseInt(mYyyyMm[1], 10)
    const month = parseInt(mYyyyMm[2], 10)
    if (month >= 1 && month <= 12) {
      const d = new Date(year, month, 0, 12, 0, 0)
      return d
    }
    return null
  }

  // 5. YYYY -> 31 de dezembro daquele ano
  const mYyyy = str.match(/^(\d{4})$/)
  if (mYyyy) {
    const year = parseInt(mYyyy[1], 10)
    if (year >= 1900 && year <= 2100) {
      return new Date(year, 11, 31, 12, 0, 0)
    }
    return null
  }

  return null
}

interface EntradaStatusOrientacao {
  status?: string | null
  fim?: string | null
  cancelado?: boolean | null
}

/**
 * Calcula o status efetivo derivado da orientação.
 * @param orientacao Dados parciais da orientação
 * @param dataReferencia Data base de comparação (default: new Date() no início do dia)
 */
export function calcularStatusEfetivoOrientacao(
  orientacao: EntradaStatusOrientacao,
  dataReferencia: Date = new Date(),
): 'em_andamento' | 'concluido' | 'cancelado' {
  // 1. Switcher Cancelado = TRUE ou status gravado 'cancelado'
  if (orientacao.cancelado === true || orientacao.status === 'cancelado') {
    return 'cancelado'
  }

  // 2. Data de término analisada de forma segura
  const dataFim = parseDataFimOrientacao(orientacao.fim)

  if (dataFim !== null) {
    // Normaliza referência para o início do dia
    const ref = new Date(
      dataReferencia.getFullYear(),
      dataReferencia.getMonth(),
      dataReferencia.getDate(),
      23,
      59,
      59,
      999,
    )
    if (dataFim.getTime() <= ref.getTime()) {
      return 'concluido'
    }
    return 'em_andamento'
  }

  // 3. Se não tem data de término válida:
  // Se o registro antigo já era explicitamente 'concluido' e sem data, preserva 'concluido'
  if (orientacao.status === 'concluido' && (!orientacao.fim || !String(orientacao.fim).trim())) {
    return 'concluido'
  }

  // Se ficou em branco, formato inválido, etc. -> 'em_andamento'
  return 'em_andamento'
}

// Orientação concluída (mesmo critério de isMestradoConcluido/isDoutoradoConcluido em calculo.ts).
function orientacaoConcluida(ori: any): boolean {
  const statusEfetivo =
    ori.status_efetivo ||
    calcularStatusEfetivoOrientacao({ status: ori.status, fim: ori.fim, cancelado: ori.cancelado })
  const statusNorm = (ori.status || '').toLowerCase().trim()
  return (
    statusEfetivo === 'concluido' ||
    statusNorm === 'concluido' ||
    statusNorm === 'titulado' ||
    Boolean(ori.data_defesa)
  )
}

// Critério I: orientação cancelada não conta; concluída conta pelo ano da defesa/fim;
// em andamento conta se esteve vigente em algum ano do período (mesmo iniciada antes dele).
export function orientacaoVigenteNoPeriodo(ori: any, inicio = ANO_INICIO, fim = ANO_FIM): boolean {
  const statusEfetivo =
    ori.status_efetivo ||
    calcularStatusEfetivoOrientacao({ status: ori.status, fim: ori.fim, cancelado: ori.cancelado })
  if (statusEfetivo === 'cancelado') return false

  if (orientacaoConcluida(ori)) return anoNoPeriodo(obterAnoOrientacaoDefesa(ori), inicio, fim)

  const anoIni = extrairAnoDeData(ori.inicio)
  if (anoIni === null) return anoNoPeriodo(obterAnoOrientacaoDefesa(ori), inicio, fim)
  const anoFim = extrairAnoDeData(ori.fim)
  return anoIni <= fim && (anoFim === null || anoFim >= inicio)
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
  publicacoesDocentes?: any[]
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
    publicacoesDocentes = [],
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
    const noPeriodo = orientacaoVigenteNoPeriodo(ori, anoInicio, anoFim)
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
  const disciplinasDoDocente = disciplinas.filter((disc) =>
    idsDocentesDaDisciplina(disc).includes(docente.id),
  )
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
  // Usa preferencialmente projetos_participantes + coordenador_id
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
  const tituladasNoPeriodo = (nivel: string) =>
    orientacoesDoDocente.filter((ori) => {
      const tipo = (ori.tipo || '').toLowerCase().trim()
      return (
        orientacaoConcluida(ori) &&
        tipo.includes(nivel) &&
        anoNoPeriodo(obterAnoOrientacaoDefesa(ori), anoInicio, anoFim)
      )
    })
  const msc = tituladasNoPeriodo('mestrado').length
  const dsc = tituladasNoPeriodo('doutorado').length

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

  // R4: Identificação estruturada das publicações do docente via publicacoes_docentes
  // Usa vínculos estruturados se existirem; se não houver registros em publicacoes_docentes
  // para o docente, mantém fallback consistente via pub.autores.
  const pubsDocentesVinc = (publicacoesDocentes || []).filter(
    (pd: any) => pd.docente_id === docente.id,
  )
  const temVinculosEstruturadosDocente = pubsDocentesVinc.length > 0
  const idsPubsEstruturadas = new Set(pubsDocentesVinc.map((pd: any) => pd.publicacao_id))

  const publicacoesDocenteNoPeriodo = publicacoes.filter((pub) => {
    if (!anoNoPeriodo(pub.ano, anoInicio, anoFim)) return false

    const pertenceAoDocente = temVinculosEstruturadosDocente
      ? idsPubsEstruturadas.has(pub.id)
      : textoContemDocente(pub.autores, termosNome)
    if (!pertenceAoDocente) return false

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
