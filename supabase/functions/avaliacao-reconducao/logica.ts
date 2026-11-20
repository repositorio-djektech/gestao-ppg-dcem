import {
  aplicarAtribuicao,
  avaliarCriterioIV,
  dadosDesempate,
  decidirVeredito,
  montarOrientadores,
  NOTA_CORTE_PADRAO,
  NOTA_METODOLOGICA_PDQ,
  observacaoDaCategoria,
} from './pdq.ts'

// Período padrão (2025-2028), só como reserva. A avaliação do docente usa a janela dos 4 anos civis
// anteriores ao ano da avaliação (enviada na requisição ou calculada pelo ano corrente), D-36.
export const ANO_INICIO = 2025
export const ANO_FIM = 2028

export { NOTA_CORTE_PADRAO }

/** Nota metodológica do critério IV (PDQ da IN 02/2026). */
export const NOTA_SIMPLIFICACAO_NP = NOTA_METODOLOGICA_PDQ

export const NOTA_DISCIPLINAS_TEMPORAIS =
  'Quando a disciplina vinculada ao docente possui campo de ano/período (ano_semestre), valida-se a pertinência ao período de avaliação em curso. Caso o campo não contenha ano identificável, a disciplina vinculada é aceita como evidência de docência no programa e informada no detalhe.'

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

export function avaliarDocenteLogica(params: {
  docente: any
  orientacoes: any[]
  disciplinas: any[]
  projetos: any[]
  participantesProjetos: any[]
  publicacoes: any[]
  publicacoesDocentes?: any[]
  coautoresPrograma?: any[]
  egressos?: any[]
  discentes?: any[]
  notaCorte?: number
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
    egressos = [],
    discentes = [],
    notaCorte = NOTA_CORTE_PADRAO,
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

  // 4. Critério IV: PDQ = (2 × ATD) + DPIDE1 + DPTDE1 >= nota de corte (IN 02/2026, D-36)
  // M e D: concluídos no período, como orientador principal (coorientação não conta, D-19)
  const tituladasNoPeriodo = (nivel: string) =>
    orientacoesDoDocente.filter((ori) => {
      const tipo = (ori.tipo || '').toLowerCase().trim()
      return (
        ori.flag_orientador_principal === true &&
        orientacaoConcluida(ori) &&
        tipo.includes(nivel) &&
        anoNoPeriodo(obterAnoOrientacaoDefesa(ori), anoInicio, anoFim)
      )
    })
  const mestradosConcluidos = tituladasNoPeriodo('mestrado')
  const doutoradosConcluidos = tituladasNoPeriodo('doutorado')
  const msc = mestradosConcluidos.length
  const dsc = doutoradosConcluidos.length

  // R4: Identificação estruturada das publicações do docente via publicacoes_docentes
  // Usa vínculos estruturados se existirem; se não houver registros em publicacoes_docentes
  // para o docente, mantém fallback consistente via pub.autores.
  const pubsDocentesVinc = (publicacoesDocentes || []).filter(
    (pd: any) => pd.docente_id === docente.id,
  )
  const temVinculosEstruturadosDocente = pubsDocentesVinc.length > 0
  const idsPubsEstruturadas = new Set(pubsDocentesVinc.map((pd: any) => pd.publicacao_id))

  // Publicações do docente na janela da avaliação (sem corte por JCR: a IN usa o Qualis)
  const publicacoesDocenteNoPeriodo = publicacoes.filter((pub) => {
    if (!anoNoPeriodo(pub.ano, anoInicio, anoFim)) return false
    return temVinculosEstruturadosDocente
      ? idsPubsEstruturadas.has(pub.id)
      : textoContemDocente(pub.autores, termosNome)
  })

  // §7º: a publicação com mais de um docente do programa só vale para um deles
  const atribuicao = temVinculosEstruturadosDocente
    ? aplicarAtribuicao({
        docenteId: Number(docente.id),
        publicacoes: publicacoesDocenteNoPeriodo,
        vinculos: publicacoesDocentes,
        coautores: coautoresPrograma,
        orientadores: montarOrientadores(discentes, egressos),
      })
    : { contam: publicacoesDocenteNoPeriodo, cedidas: [] as any[], conflitos: [] as any[] }

  const critIV = avaliarCriterioIV({
    publicacoesDoDocente: atribuicao.contam,
    coautoresPrograma,
    egressos,
    msc,
    dsc,
    notaCorte,
  })
  const pdq_detalhes = critIV.detalhes
  const confirmadasList = critIV.confirmadas
  const pendentesList = critIV.pendentes
  const semCoautoriaList = critIV.semCoautoria
  const np = pdq_detalhes.np
  const np_teto = pdq_detalhes.np_teto
  const critIV_atendido = critIV.atendido

  const criterio_iv = {
    atendido: critIV_atendido,
    quantidade: np,
    detalhe: critIV.detalhe,
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
  if (critIV.motivo) {
    motivos.push(critIV.motivo)
  }

  // Veredito por categoria (IN 02/2026): vale para permanentes, colaboradores e visitantes
  const veredito: string = decidirVeredito(
    categoria,
    critI_atendido,
    critII_atendido,
    critIII_atendido,
    critIV_atendido,
  )
  const observacao = observacaoDaCategoria(categoria, veredito as any)
  if (observacao) motivos.push(observacao)

  // Desempate (arts. 10 e 11): bolsa, menor tempo de conclusão e tempo de UFS
  const desempate = dadosDesempate({
    bolsaCnpq: docente.bolsa_cnpq,
    ingressoUfs: docente.ingresso_ufs,
    concluidas: [...mestradosConcluidos, ...doutoradosConcluidos],
  })

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
    atribuicao: { cedidas: atribuicao.cedidas, conflitos: atribuicao.conflitos },
    desempate,
    veredito,
    motivos,
  }
}
