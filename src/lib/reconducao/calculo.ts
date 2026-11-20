import { ANO_INICIO, ANO_FIM, extrairAnoNumerico } from '../lattes/quadrienio'
import { calcularStatusEfetivoOrientacao } from '../orientacoes/status'
import { idsDocentesDaDisciplina } from '../disciplinas/docentes'
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
import {
  avaliarCriterioIV,
  janelaAvaliacaoDocente,
  NOTA_CORTE_PADRAO,
  NOTA_METODOLOGICA_PDQ,
} from '../../../supabase/functions/avaliacao-reconducao/pdq'

export { janelaAvaliacaoDocente, NOTA_CORTE_PADRAO }

/** Nota metodológica do critério IV (PDQ da IN 02/2026, D-36). */
export const NOTA_SIMPLIFICACAO_NP = NOTA_METODOLOGICA_PDQ

export const NOTA_DISCIPLINAS_TEMPORAIS =
  'Quando a disciplina vinculada ao docente possui campo de ano/período (ano_semestre), valida-se a pertinência ao período de avaliação em curso. Caso o campo não contenha ano identificável, a disciplina vinculada é aceita como evidência de docência no programa e informada no detalhe.'

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
 * Verifica se a orientação conta no período para o Critério I (orientador principal).
 * - Cancelada: nunca conta.
 * - Concluída (status efetivo, status gravado ou data de defesa): conta pelo ano da defesa/fim.
 * - Em andamento: conta se esteve vigente em qualquer ano do período (início <= fim do período
 *   e, havendo fim, fim >= início do período), mesmo tendo começado antes do quadriênio.
 */
export function orientacaoVigenteNoPeriodo(
  ori: Orientacao,
  inicio = ANO_INICIO,
  fim = ANO_FIM,
): boolean {
  const statusEfetivo =
    ori.status_efetivo ||
    calcularStatusEfetivoOrientacao({
      status: ori.status,
      fim: ori.fim,
      cancelado: ori.cancelado,
    })
  if (statusEfetivo === 'cancelado') return false

  const statusNorm = (ori.status || '').toLowerCase().trim()
  const concluida =
    statusEfetivo === 'concluido' ||
    statusNorm === 'concluido' ||
    statusNorm === 'titulado' ||
    Boolean(ori.data_defesa)
  if (concluida) return orientacaoNoPeriodo(ori, inicio, fim)

  const anoIni = extrairAnoDeData(ori.inicio)
  if (anoIni === null) return orientacaoNoPeriodo(ori, inicio, fim)
  const anoFim = extrairAnoDeData(ori.fim)
  return anoIni <= fim && (anoFim === null || anoFim >= inicio)
}

/**
 * Determina se uma orientação é de mestrado concluída.
 */
export function isMestradoConcluido(ori: Orientacao): boolean {
  const statusEfetivo =
    ori.status_efetivo ||
    calcularStatusEfetivoOrientacao({
      status: ori.status,
      fim: ori.fim,
      cancelado: ori.cancelado,
    })
  const statusNorm = (ori.status || '').toLowerCase().trim()
  const tipoNorm = (ori.tipo || '').toLowerCase().trim()
  const concluido =
    statusEfetivo === 'concluido' ||
    statusNorm === 'concluido' ||
    statusNorm === 'titulado' ||
    Boolean(ori.data_defesa)
  const mestrado = tipoNorm.includes('mestrado')
  return concluido && mestrado
}

/**
 * Determina se uma orientação é de doutorado concluída.
 */
export function isDoutoradoConcluido(ori: Orientacao): boolean {
  const statusEfetivo =
    ori.status_efetivo ||
    calcularStatusEfetivoOrientacao({
      status: ori.status,
      fim: ori.fim,
      cancelado: ori.cancelado,
    })
  const statusNorm = (ori.status || '').toLowerCase().trim()
  const tipoNorm = (ori.tipo || '').toLowerCase().trim()
  const concluido =
    statusEfetivo === 'concluido' ||
    statusNorm === 'concluido' ||
    statusNorm === 'titulado' ||
    Boolean(ori.data_defesa)
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
 * Exige ao menos 2 termos do nome (ou o \u00fanico termo, se o nome s\u00f3 tiver um) para que
 * um sobrenome comum isolado ("Silva") n\u00e3o case com outro docente.
 */
export function textoContemDocente(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto) return false
  if (termos.length === 0) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const minimo = Math.min(2, termos.length)
  return termos.filter((termo) => norm.includes(termo)).length >= minimo
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

export interface DadosParaAvaliacao {
  docente: Docente
  orientacoes: Orientacao[]
  disciplinas: Disciplina[]
  projetos: ProjetoPesquisa[]
  participantesProjetos: ProjetoParticipante[]
  publicacoes: Publicacao[]
  publicacoesDocentes?: Array<{
    publicacao_id: number
    docente_id: number
  }>
  coautoresPrograma?: Array<{
    publicacao_id: number
    tipo: string
    nome_citado?: string
    egresso_id?: number | null
  }>
  /** Egressos (id e ano de titulação), para a janela de 5 anos da coautoria de egresso. */
  egressos?: Array<{ id: number; ano_titulacao?: number | null }>
  /** Nota de corte do PDQ para o ano da avaliação (padrão 1,0). */
  notaCorte?: number
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
    itens: orientacoesPrincipaisNoPeriodo,
  }

  // --------------------------------------------------------------------------
  // CRITÉRIO II: Ministraram disciplinas no P²CEM
  // --------------------------------------------------------------------------
  const disciplinasDoDocente = disciplinas.filter((disc) =>
    idsDocentesDaDisciplina(disc).includes(docente.id),
  )

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
  // CRITÉRIO IV: PDQ = (2 × ATD) + DPIDE1 + DPTDE1 >= nota de corte (IN 02/2026, D-36)
  // --------------------------------------------------------------------------
  // M e D: orientações de mestrado/doutorado CONCLUÍDAS no período, como orientador principal
  // (coorientação não conta, D-19)
  const principaisDoDocente = orientacoesDoDocente.filter(
    (ori) => ori.flag_orientador_principal === true,
  )
  const msc = principaisDoDocente.filter(
    (ori) => isMestradoConcluido(ori) && orientacaoNoPeriodo(ori, anoInicio, anoFim),
  ).length
  const dsc = principaisDoDocente.filter(
    (ori) => isDoutoradoConcluido(ori) && orientacaoNoPeriodo(ori, anoInicio, anoFim),
  ).length

  // R4: Identificação estruturada das publicações do docente via publicacoes_docentes
  // Se existirem vínculos estruturados para o docente, usa-os preferencialmente;
  // Fallback: se não houver registros estruturados em publicacoes_docentes para o docente,
  // usa a correspondência textual anterior em pub.autores.
  const pubsDocentesVinc = (params.publicacoesDocentes || []).filter(
    (pd) => pd.docente_id === docente.id,
  )
  const temVinculosEstruturadosDocente = pubsDocentesVinc.length > 0
  const idsPubsEstruturadas = new Set(pubsDocentesVinc.map((pd) => pd.publicacao_id))

  // Publicações do docente na janela da avaliação (sem corte por JCR: a IN usa o Qualis)
  const publicacoesDocenteNoPeriodo = publicacoes.filter((pub) => {
    if (!anoNoPeriodo(pub.ano, anoInicio, anoFim)) return false
    return temVinculosEstruturadosDocente
      ? idsPubsEstruturadas.has(pub.id)
      : textoContemDocente(pub.autores, termosNome)
  })

  const critIV = avaliarCriterioIV({
    publicacoesDoDocente: publicacoesDocenteNoPeriodo as any[],
    coautoresPrograma: (params.coautoresPrograma || []) as any[],
    egressos: params.egressos || [],
    msc,
    dsc,
    notaCorte: params.notaCorte,
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
  if (critIV.motivo) {
    motivos.push(critIV.motivo)
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
    } else if (critI_atendido && critII_atendido && critIII_atendido && !critIV_atendido) {
      // I a III atendidos; só o PDQ ficou abaixo da nota de corte
      veredito = 'PDQ_INSUFICIENTE'
    } else {
      veredito = 'NAO_ATENDE'
    }
  }

  return {
    docente_id: docente.id,
    nome: docente.nome,
    categoria,
    status: docente.status !== false,
    scopus_id: docente.scopus_id || null,
    id_lattes: docente.id_lattes || null,
    criterio_i,
    criterio_ii,
    criterio_iii,
    criterio_iv,
    pdq_detalhes,
    np_estrito: np,
    np_teto,
    publicacoes_confirmadas: confirmadasList as any,
    publicacoes_pendentes: pendentesList as any,
    publicacoes_sem_coautoria: semCoautoriaList as any,
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
  publicacoesDocentes?: Array<{
    publicacao_id: number
    docente_id: number
  }>
  coautoresPrograma?: Array<{
    publicacao_id: number
    tipo: string
    nome_citado?: string
    egresso_id?: number | null
  }>
  egressos?: Array<{ id: number; ano_titulacao?: number | null }>
  /** Nota de corte do PDQ para o ano da avaliação (padrão 1,0). */
  notaCorte?: number
  /** Ano da avaliação do docente (janela = 4 anos anteriores); só informativo no relatório. */
  anoAvaliacao?: number
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
    publicacoesDocentes = [],
    coautoresPrograma = [],
    egressos = [],
    notaCorte = NOTA_CORTE_PADRAO,
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
      publicacoesDocentes,
      coautoresPrograma,
      egressos,
      notaCorte,
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
    avaliacao: {
      ano_avaliacao: params.anoAvaliacao ?? anoFim + 1,
      ano_inicio: anoInicio,
      ano_fim: anoFim,
      nota_corte: notaCorte,
    },
    nota_metodologica: {
      criterio_iv_np_coautoria: NOTA_SIMPLIFICACAO_NP,
      criterio_ii_disciplinas_temporais: NOTA_DISCIPLINAS_TEMPORAIS,
    },
    resumo,
    avaliacoes,
  }
}
