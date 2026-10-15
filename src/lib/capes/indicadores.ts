import { ANO_INICIO, ANO_FIM } from '../reconducao/types'
import {
  extrairAnoDeData,
  anoNoPeriodo,
  isMestradoConcluido,
  isDoutoradoConcluido,
  orientacaoNoPeriodo,
} from '../reconducao/calculo'
import { calcularResumoJdpPrograma } from './jdp'
import type { Docente, Orientacao, Disciplina, Publicacao, Patente } from '@/types/database'
import type {
  DadosEntradaIndicadores,
  ResultadoIndicador,
  RelatorioIndicadoresCapes,
  ResumoQuesito,
  InsumoStatus,
} from './types'

/**
 * Normaliza string textual
 */
function normStr(v: unknown): string {
  return String(v || '')
    .toLowerCase()
    .trim()
}

/**
 * Verifica se um ano está dentro do período especificado
 */
function anoDentro(ano: number | null | undefined, inicio: number, fim: number): boolean {
  if (ano === null || ano === undefined) return false
  return ano >= inicio && ano <= fim
}

/**
 * Obtém ano de uma publicação
 */
function anoPublicacao(pub: Publicacao): number | null {
  if (typeof pub.ano === 'number' && !isNaN(pub.ano)) return pub.ano
  return extrairAnoDeData(pub.ano)
}

/**
 * Extrai ano de patente (a partir de created_at ou texto)
 */
function anoPatente(pat: Patente): number | null {
  if (pat.created_at) {
    const a = extrairAnoDeData(pat.created_at)
    if (a) return a
  }
  return null
}

/**
 * Normaliza termos de busca de autor a partir do nome
 */
function normalizarNomeTermos(nome: string): string[] {
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

function textoContemNome(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto || termos.length === 0) return false
  const n = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return termos.some((t) => n.includes(t))
}

/**
 * Motor central de cálculo de indicadores CAPES - Ficha Engenharias II 2025
 * Totalmente puro (sem dependência de I/O ou banco).
 */
export function calcularTodosIndicadores(
  dados: DadosEntradaIndicadores,
): RelatorioIndicadoresCapes {
  const anoReferencia = dados.anoReferencia ?? new Date().getFullYear()
  const anoInicio = dados.anoInicio ?? ANO_INICIO
  const anoFim = dados.anoFim ?? ANO_FIM

  // 1. Classificação do Corpo Docente
  const { docentes } = dados
  const totalDocentes = docentes.length

  const permanentes = docentes.filter((d) => normStr(d.categoria) === 'permanente')
  const colaboradores = docentes.filter((d) => normStr(d.categoria) === 'colaborador')
  const visitantes = docentes.filter((d) => normStr(d.categoria) === 'visitante')

  const DP = permanentes.length
  const DC = colaboradores.length
  const DV = visitantes.length

  // JDP válidos segundo jdp.ts
  const resumoJdp = calcularResumoJdpPrograma(docentes, anoReferencia)
  const JDP_validos = resumoJdp.totalJdpValidos
  const denominadorEfetivo = Math.max(0, DP - JDP_validos) // (DP - JDP)

  // Mapas de lookup
  const idsPermanentesSet = new Set<number>(permanentes.map((d) => d.id))
  const termosNomePermanentes = new Map<number, string[]>()
  for (const d of permanentes) {
    termosNomePermanentes.set(d.id, normalizarNomeTermos(d.nome))
  }

  // 2. Lookup de publicações vinculadas a docentes permanentes
  const pubDocentesList = dados.publicacoesDocentes || []
  const mapaPubIdDocentes = new Map<number, Set<number>>()
  for (const pd of pubDocentesList) {
    if (!mapaPubIdDocentes.has(pd.publicacao_id)) {
      mapaPubIdDocentes.set(pd.publicacao_id, new Set())
    }
    mapaPubIdDocentes.get(pd.publicacao_id)!.add(pd.docente_id)
  }

  // Função helper: verifica se publicação pertence a algum DP
  const pubPertenceADocentePermanente = (
    pub: Publicacao,
  ): { pertence: boolean; docIds: number[] } => {
    // Via vinculo estruturado
    if (mapaPubIdDocentes.has(pub.id)) {
      const docs = Array.from(mapaPubIdDocentes.get(pub.id)!).filter((id) =>
        idsPermanentesSet.has(id),
      )
      if (docs.length > 0) return { pertence: true, docIds: docs }
    }
    // Fallback textual em pub.autores
    const casados: number[] = []
    for (const d of permanentes) {
      const termos = termosNomePermanentes.get(d.id) || []
      if (textoContemNome(pub.autores, termos)) {
        casados.push(d.id)
      }
    }
    return { pertence: casados.length > 0, docIds: casados }
  }

  // Lookup de coautorias confirmadas com discente/egresso
  const coautoresList = dados.publicacoesCoautores || []
  const mapaCoautoriaPub = new Map<
    number,
    { temDiscenteOuEgresso: boolean; tipos: string[]; discenteIds: number[]; egressoIds: number[] }
  >()
  for (const c of coautoresList) {
    const entry = mapaCoautoriaPub.get(c.publicacao_id) || {
      temDiscenteOuEgresso: false,
      tipos: [],
      discenteIds: [],
      egressoIds: [],
    }
    const t = normStr(c.tipo)
    if (t === 'orientando' || t === 'egresso' || t === 'discente') {
      entry.temDiscenteOuEgresso = true
      entry.tipos.push(c.tipo)
      if (c.discente_id) entry.discenteIds.push(c.discente_id)
      if (c.egresso_id) entry.egressoIds.push(c.egresso_id)
    }
    mapaCoautoriaPub.set(c.publicacao_id, entry)
  }

  // Publicações no quadriênio
  const pubsNoQuadrienio = dados.publicacoes.filter((p) => {
    const a = anoPublicacao(p)
    return anoDentro(a, anoInicio, anoFim)
  })

  // Orientações concluídas no quadriênio com orientador permanente
  const oriConcluidasNoQuadrienio = dados.orientacoes.filter((o) => {
    const noPeriodo = orientacaoNoPeriodo(o, anoInicio, anoFim)
    const concluida =
      normStr(o.status) === 'concluido' ||
      normStr(o.status) === 'titulado' ||
      Boolean(o.data_defesa)
    return noPeriodo && concluida
  })

  // =========================================================================
  // QUESITO 1: ADE
  // ADE = DP / (DP + DC + DV)
  // =========================================================================
  const adeTotal = DP + DC + DV
  const adeIndicador: ResultadoIndicador = (() => {
    const insumos: InsumoStatus[] = [
      {
        totalExistente: totalDocentes,
        descricao: `${totalDocentes} docentes cadastrados no sistema`,
        atendido: totalDocentes > 0,
      },
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes (DP, inclui ${JDP_validos} JDP válidos)`,
        atendido: DP > 0,
      },
    ]

    if (adeTotal === 0) {
      return {
        id: 'ade',
        codigo: 'ADE',
        nome: 'Adequação do Corpo Docente (% DP)',
        quesito: '1',
        itemFicha: '1.2.1',
        pesoPercentual: 15,
        pesoQuesitoGeral: '35%',
        formulaTexto: 'ADE = DP / (DP + DC + DV)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes cadastrados (DP+DC+DV = 0)',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [
          { termo: 'DP', descricao: 'Docentes Permanentes (inclui JDP)', valor: DP },
          { termo: 'DC', descricao: 'Docentes Colaboradores', valor: DC },
          { termo: 'DV', descricao: 'Docentes Visitantes', valor: DV },
        ],
        insumos,
      }
    }

    const valor = Number(((DP / adeTotal) * 100).toFixed(2))
    return {
      id: 'ade',
      codigo: 'ADE',
      nome: 'Adequação do Corpo Docente (% DP)',
      quesito: '1',
      itemFicha: '1.2.1',
      pesoPercentual: 15,
      pesoQuesitoGeral: '35%',
      formulaTexto: 'ADE = DP / (DP + DC + DV)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
        { termo: 'DC', descricao: 'Docentes Colaboradores', valor: DC },
        { termo: 'DV', descricao: 'Docentes Visitantes', valor: DV },
        {
          termo: 'JDP_validos',
          descricao: 'Jovens Doutores Pesquisadores válidos (integrados no DP)',
          valor: JDP_validos,
        },
      ],
      insumos,
      observacoes:
        'A ficha CAPES exige predomínio de DP no corpo docente (mínimo 50% para conceito MB/B).',
    }
  })()

  // =========================================================================
  // QUESITO 2: FORMAÇÃO E PRODUÇÃO
  // =========================================================================

  // M e D: dissertações de mestrado e teses de doutorado concluídas no quadriênio
  const mestradosConcluidos = oriConcluidasNoQuadrienio.filter(isMestradoConcluido).length
  const doutoradosConcluidos = oriConcluidasNoQuadrienio.filter(isDoutoradoConcluido).length
  const M = mestradosConcluidos
  const D = doutoradosConcluidos

  // --- ORI: (M + 3D) / (DP - JDP) ---
  const oriIndicador: ResultadoIndicador = (() => {
    const insumos: InsumoStatus[] = [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes (${JDP_validos} JDP válidos)`,
        atendido: DP > 0,
      },
      {
        totalExistente: M + D,
        descricao: `${M} mestrados e ${D} doutorados concluídos no quadriênio (${anoInicio}–${anoFim})`,
        atendido: true,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'ori',
        codigo: 'ORI',
        nome: 'Taxa de Titulações Concluídas por Docente Permanente',
        quesito: '2',
        itemFicha: '2.1.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '30%',
        formulaTexto: 'ORI = (M + 3D) / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'M', descricao: 'Mestrados concluídos no quadriênio', valor: M },
          { termo: 'D', descricao: 'Doutorados concluídos no quadriênio', valor: D },
          { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
          {
            termo: 'JDP',
            descricao: 'JDP válidos (subtraídos do denominador)',
            valor: JDP_validos,
          },
        ],
        insumos,
      }
    }

    // Se não há nenhuma orientação concluída registrada no quadriênio, apontar aguardando insumo
    if (M === 0 && D === 0) {
      return {
        id: 'ori',
        codigo: 'ORI',
        nome: 'Taxa de Titulações Concluídas por Docente Permanente',
        quesito: '2',
        itemFicha: '2.1.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '30%',
        formulaTexto: 'ORI = (M + 3D) / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de defesas/titulações concluídas no quadriênio (M=0 e D=0 registrados)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'M', descricao: 'Mestrados concluídos', valor: 0 },
          { termo: 'D', descricao: 'Doutorados concluídos', valor: 0 },
          { termo: 'DP - JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number(((M + 3 * D) / denominadorEfetivo).toFixed(3))
    return {
      id: 'ori',
      codigo: 'ORI',
      nome: 'Taxa de Titulações Concluídas por Docente Permanente',
      quesito: '2',
      itemFicha: '2.1.1',
      pesoPercentual: 10,
      pesoQuesitoGeral: '30%',
      formulaTexto: 'ORI = (M + 3D) / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'M', descricao: 'Mestrados concluídos', valor: M },
        { termo: 'D', descricao: 'Doutorados concluídos', valor: D },
        { termo: 'M + 3D', descricao: 'Numerador ponderado', valor: M + 3 * D },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- ATD: artigos A1-A4 com coautoria confirmada discente/egresso / (M + 2D) ---
  // Publicações A1-A4 no quadriênio com coautoria de discente ou egresso
  const pubsA1A4ComCoautoria = pubsNoQuadrienio.filter((p) => {
    const estrato = (p.estrato_qualis || '').toUpperCase()
    const isA1A4 = ['A1', 'A2', 'A3', 'A4'].includes(estrato)
    const temCoautoria = mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true
    return isA1A4 && temCoautoria
  })

  const atdIndicador: ResultadoIndicador = (() => {
    const denAtd = M + 2 * D
    const insumos: InsumoStatus[] = [
      {
        totalExistente: pubsA1A4ComCoautoria.length,
        descricao: `${pubsA1A4ComCoautoria.length} artigos A1–A4 com coautoria confirmada de discente/egresso`,
        atendido: pubsA1A4ComCoautoria.length > 0,
      },
      {
        totalExistente: denAtd,
        descricao: `Denominador M + 2D: ${M} mestrados e ${D} doutorados (${denAtd})`,
        atendido: denAtd > 0,
      },
    ]

    if (denAtd === 0) {
      return {
        id: 'atd',
        codigo: 'ATD',
        nome: 'Artigos A1–A4 com Discentes/Egressos por Titulação',
        quesito: '2',
        itemFicha: '2.1.2',
        pesoPercentual: 10,
        pesoQuesitoGeral: '30%',
        formulaTexto: 'ATD = (artigos A1–A4 c/ coautoria discente/egresso) / (M + 2D)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de titulações concluídas no quadriênio (M + 2D = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          {
            termo: 'Artigos A1-A4 c/ coautoria',
            descricao: 'Publicações qualificadas com discente/egresso',
            valor: pubsA1A4ComCoautoria.length,
          },
          { termo: 'M + 2D', descricao: 'Denominador de titulações', valor: 0 },
        ],
        insumos,
      }
    }

    const valor = Number((pubsA1A4ComCoautoria.length / denAtd).toFixed(3))
    return {
      id: 'atd',
      codigo: 'ATD',
      nome: 'Artigos A1–A4 com Discentes/Egressos por Titulação',
      quesito: '2',
      itemFicha: '2.1.2',
      pesoPercentual: 10,
      pesoQuesitoGeral: '30%',
      formulaTexto: 'ATD = (artigos A1–A4 c/ coautoria discente/egresso) / (M + 2D)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        {
          termo: 'Artigos A1-A4 c/ coautoria',
          descricao: 'Publicações qualificadas com discente/egresso',
          valor: pubsA1A4ComCoautoria.length,
        },
        { termo: 'M', descricao: 'Mestrados concluídos', valor: M },
        { termo: 'D', descricao: 'Doutorados concluídos', valor: D },
        { termo: 'M + 2D', descricao: 'Denominador de titulações', valor: denAtd },
      ],
      insumos,
    }
  })()

  // --- Função auxiliar de contagem de Qualis e pontuação com saturação em B1 ---
  // DPI / DPIDE1 / DPIDE2 / DPI2
  // Fórmula padrão: [A1 + 0.875*A2 + 0.75*A3 + 0.675*A4 + 0.5*min(B1, DP)] / (DP - JDP)
  function calcularPontuacaoQualisComSaturacao(publicacoesSubset: Publicacao[]): {
    a1: number
    a2: number
    a3: number
    a4: number
    b1Bruto: number
    b1Saturado: number
    pontosNumerador: number
  } {
    let a1 = 0
    let a2 = 0
    let a3 = 0
    let a4 = 0
    let b1Bruto = 0

    for (const p of publicacoesSubset) {
      const e = (p.estrato_qualis || '').toUpperCase().trim()
      if (e === 'A1') a1++
      else if (e === 'A2') a2++
      else if (e === 'A3') a3++
      else if (e === 'A4') a4++
      else if (e === 'B1') b1Bruto++
    }

    const b1Saturado = Math.min(b1Bruto, DP)
    const pontosNumerador = Number(
      (a1 + 0.875 * a2 + 0.75 * a3 + 0.675 * a4 + 0.5 * b1Saturado).toFixed(3),
    )

    return { a1, a2, a3, a4, b1Bruto, b1Saturado, pontosNumerador }
  }

  // Identificação de publicações de Docentes Permanentes em periódicos no quadriênio
  const pubsDpPeriodicosQuadrienio = pubsNoQuadrienio.filter((p) => {
    // Tipo de produção: periódico
    const tp = normStr(p.tipo_producao)
    const isPeriodico = tp === '' || tp === 'artigo em periódico' || Boolean(p.periodico)
    if (!isPeriodico) return false
    // Pertence a algum DP
    return pubPertenceADocentePermanente(p).pertence
  })

  // Quantidade de publicações com estrato Qualis preenchido
  const totalPubsComQualis = pubsNoQuadrienio.filter((p) => Boolean(p.estrato_qualis)).length

  // --- DPI (item 2.4.1): Produção dos DPs no quadriênio ---
  const dpiIndicador: ResultadoIndicador = (() => {
    const { a1, a2, a3, a4, b1Bruto, b1Saturado, pontosNumerador } =
      calcularPontuacaoQualisComSaturacao(pubsDpPeriodicosQuadrienio)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: pubsDpPeriodicosQuadrienio.length,
        descricao: `${pubsDpPeriodicosQuadrienio.length} publicações de docentes permanentes no quadriênio`,
        atendido: pubsDpPeriodicosQuadrienio.length > 0,
      },
      {
        totalExistente: totalPubsComQualis,
        descricao: `${totalPubsComQualis} publicações com estrato Qualis definido no banco`,
        atendido: totalPubsComQualis > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'dpi',
        codigo: 'DPI',
        nome: 'Índice de Produção Docente Ponderada (DPI)',
        quesito: '2',
        itemFicha: '2.4.1',
        pesoPercentual: 6,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPI = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'A1', descricao: 'Artigos A1', valor: a1 },
          { termo: 'A2', descricao: 'Artigos A2', valor: a2 },
          { termo: 'A3', descricao: 'Artigos A3', valor: a3 },
          { termo: 'A4', descricao: 'Artigos A4', valor: a4 },
          { termo: 'B1', descricao: 'Artigos B1 brutos (sat: min(B1, DP))', valor: b1Bruto },
        ],
        insumos,
      }
    }

    if (totalPubsComQualis === 0) {
      return {
        id: 'dpi',
        codigo: 'DPI',
        nome: 'Índice de Produção Docente Ponderada (DPI)',
        quesito: '2',
        itemFicha: '2.4.1',
        pesoPercentual: 6,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPI = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de estrato Qualis nas publicações (0 artigos classificados)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'A1..A4, B1', descricao: 'Artigos classificados', valor: 0 },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number((pontosNumerador / denominadorEfetivo).toFixed(3))
    return {
      id: 'dpi',
      codigo: 'DPI',
      nome: 'Índice de Produção Docente Ponderada (DPI)',
      quesito: '2',
      itemFicha: '2.4.1',
      pesoPercentual: 6,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPI = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'A1 (peso 1.0)', descricao: 'Artigos A1', valor: a1 },
        { termo: 'A2 (peso 0.875)', descricao: 'Artigos A2', valor: a2 },
        { termo: 'A3 (peso 0.75)', descricao: 'Artigos A3', valor: a3 },
        { termo: 'A4 (peso 0.675)', descricao: 'Artigos A4', valor: a4 },
        {
          termo: 'min(B1, DP) (peso 0.5)',
          descricao: `Artigos B1 saturados (${b1Bruto} brutos, teto ${DP})`,
          valor: b1Saturado,
        },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
      observacoes: 'Aplica saturação min(B1, DP) conforme especificado pela Ficha CAPES.',
    }
  })()

  // --- DPT (item 2.4.1): artigos completos (periódicos + anais) + capítulos / (DP − JDP) ---
  const pubsDpTotais = pubsNoQuadrienio.filter((p) => pubPertenceADocentePermanente(p).pertence)
  const dptIndicador: ResultadoIndicador = (() => {
    let periodicos = 0
    let anais = 0
    let capitulos = 0

    for (const p of pubsDpTotais) {
      const tp = normStr(p.tipo_producao)
      if (tp === 'artigo em periódico' || tp === '' || Boolean(p.periodico)) {
        periodicos++
      } else if (tp === 'trabalho em anais') {
        anais++
      } else if (tp === 'capítulo') {
        capitulos++
      } else {
        periodicos++
      }
    }

    const totalItens = periodicos + anais + capitulos
    const insumos: InsumoStatus[] = [
      {
        totalExistente: totalItens,
        descricao: `${totalItens} produções completas identificadas (${periodicos} periódicos, ${anais} anais, ${capitulos} capítulos)`,
        atendido: totalItens > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'dpt',
        codigo: 'DPT',
        nome: 'Índice de Produção Total dos Docentes (DPT)',
        quesito: '2',
        itemFicha: '2.4.1',
        pesoPercentual: 2,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPT = (artigos completos + anais + capítulos) / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'Periódicos', descricao: 'Artigos em periódicos', valor: periodicos },
          { termo: 'Anais', descricao: 'Trabalhos em anais', valor: anais },
          { termo: 'Capítulos', descricao: 'Capítulos de livros', valor: capitulos },
        ],
        insumos,
      }
    }

    if (totalItens === 0) {
      return {
        id: 'dpt',
        codigo: 'DPT',
        nome: 'Índice de Produção Total dos Docentes (DPT)',
        quesito: '2',
        itemFicha: '2.4.1',
        pesoPercentual: 2,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPT = (artigos completos + anais + capítulos) / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de publicações registradas vinculadas a docentes permanentes',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'Produções totais', descricao: 'Itens no período', valor: 0 },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number((totalItens / denominadorEfetivo).toFixed(3))
    return {
      id: 'dpt',
      codigo: 'DPT',
      nome: 'Índice de Produção Total dos Docentes (DPT)',
      quesito: '2',
      itemFicha: '2.4.1',
      pesoPercentual: 2,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPT = (artigos completos + anais + capítulos) / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'Periódicos', descricao: 'Artigos em periódicos', valor: periodicos },
        { termo: 'Anais', descricao: 'Trabalhos em anais', valor: anais },
        { termo: 'Capítulos', descricao: 'Capítulos de livros', valor: capitulos },
        { termo: 'Total', descricao: 'Soma de produções', valor: totalItens },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- DPIDE1 (item 2.2.1): fórmula do DPI apenas com coautoria discente/egresso ---
  const pubsComCoautoria = pubsNoQuadrienio.filter(
    (p) => mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true,
  )
  const dpide1Indicador: ResultadoIndicador = (() => {
    const { a1, a2, a3, a4, b1Bruto, b1Saturado, pontosNumerador } =
      calcularPontuacaoQualisComSaturacao(pubsComCoautoria)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: pubsComCoautoria.length,
        descricao: `${pubsComCoautoria.length} publicações com coautoria confirmada de discente/egresso`,
        atendido: pubsComCoautoria.length > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'dpide1',
        codigo: 'DPIDE1',
        nome: 'DPI com Coautoria de Discentes e Egressos (Nível 1)',
        quesito: '2',
        itemFicha: '2.2.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '25%',
        formulaTexto:
          'DPIDE1 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (pubsComCoautoria.length === 0) {
      return {
        id: 'dpide1',
        codigo: 'DPIDE1',
        nome: 'DPI com Coautoria de Discentes e Egressos (Nível 1)',
        quesito: '2',
        itemFicha: '2.2.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '25%',
        formulaTexto:
          'DPIDE1 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando confirmação de coautorias com discentes/egressos no sistema',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          {
            termo: 'Coautorias confirmadas',
            descricao: 'Vínculos discente/egresso em publicações',
            valor: 0,
          },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number((pontosNumerador / denominadorEfetivo).toFixed(3))
    return {
      id: 'dpide1',
      codigo: 'DPIDE1',
      nome: 'DPI com Coautoria de Discentes e Egressos (Nível 1)',
      quesito: '2',
      itemFicha: '2.2.1',
      pesoPercentual: 10,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPIDE1 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'A1', descricao: 'Artigos A1 c/ discente', valor: a1 },
        { termo: 'A2', descricao: 'Artigos A2 c/ discente', valor: a2 },
        { termo: 'A3', descricao: 'Artigos A3 c/ discente', valor: a3 },
        { termo: 'A4', descricao: 'Artigos A4 c/ discente', valor: a4 },
        { termo: 'min(B1, DP)', descricao: `B1 saturado (${b1Bruto} brutos)`, valor: b1Saturado },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- DPIDE2 (item 2.2.2): fórmula do DPI apenas com coautoria de discentes do Nível 2 ---
  const pubsNivel2ComCoautoria = pubsNoQuadrienio.filter((p) => {
    const isNivel2 = p.indicacao_nivel === 2
    const temCoautoria = mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true
    return isNivel2 && temCoautoria
  })

  const dpide2Indicador: ResultadoIndicador = (() => {
    const totalNivel2 = pubsNoQuadrienio.filter((p) => p.indicacao_nivel === 2).length
    const { a1, a2, a3, a4, b1Bruto, b1Saturado, pontosNumerador } =
      calcularPontuacaoQualisComSaturacao(pubsNivel2ComCoautoria)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: totalNivel2,
        descricao: `${totalNivel2} publicações indicadas no Nível 2 pelo programa`,
        atendido: totalNivel2 > 0,
      },
      {
        totalExistente: pubsNivel2ComCoautoria.length,
        descricao: `${pubsNivel2ComCoautoria.length} publicações Nível 2 com coautoria de discente/egresso`,
        atendido: pubsNivel2ComCoautoria.length > 0,
      },
    ]

    if (totalNivel2 === 0) {
      return {
        id: 'dpide2',
        codigo: 'DPIDE2',
        nome: 'DPI de Publicações Melhores com Discentes (Nível 2)',
        quesito: '2',
        itemFicha: '2.2.2',
        pesoPercentual: 12,
        pesoQuesitoGeral: '25%',
        formulaTexto:
          'DPIDE2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando indicação de publicações Nível 2 pelo programa (indicacao_nivel=2)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [{ termo: 'Publicações Nível 2', descricao: 'Total indicadas', valor: 0 }],
        insumos,
      }
    }

    if (denominadorEfetivo === 0) {
      return {
        id: 'dpide2',
        codigo: 'DPIDE2',
        nome: 'DPI de Publicações Melhores com Discentes (Nível 2)',
        quesito: '2',
        itemFicha: '2.2.2',
        pesoPercentual: 12,
        pesoQuesitoGeral: '25%',
        formulaTexto:
          'DPIDE2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    const valor = Number((pontosNumerador / denominadorEfetivo).toFixed(3))
    return {
      id: 'dpide2',
      codigo: 'DPIDE2',
      nome: 'DPI de Publicações Melhores com Discentes (Nível 2)',
      quesito: '2',
      itemFicha: '2.2.2',
      pesoPercentual: 12,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPIDE2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'A1 N2', descricao: 'Artigos A1 no Nível 2', valor: a1 },
        { termo: 'A2 N2', descricao: 'Artigos A2 no Nível 2', valor: a2 },
        { termo: 'A3 N2', descricao: 'Artigos A3 no Nível 2', valor: a3 },
        { termo: 'A4 N2', descricao: 'Artigos A4 no Nível 2', valor: a4 },
        {
          termo: 'min(B1, DP)',
          descricao: `B1 N2 saturado (${b1Bruto} brutos)`,
          valor: b1Saturado,
        },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- DPI2 (item 2.4.3): todas as publicações Nível 2 dos DPs ---
  const pubsNivel2Geral = pubsNoQuadrienio.filter((p) => p.indicacao_nivel === 2)
  const dpi2Indicador: ResultadoIndicador = (() => {
    const { a1, a2, a3, a4, b1Bruto, b1Saturado, pontosNumerador } =
      calcularPontuacaoQualisComSaturacao(pubsNivel2Geral)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: pubsNivel2Geral.length,
        descricao: `${pubsNivel2Geral.length} publicações Nível 2 indicadas pelo programa`,
        atendido: pubsNivel2Geral.length > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (pubsNivel2Geral.length === 0) {
      return {
        id: 'dpi2',
        codigo: 'DPI2',
        nome: 'DPI das Melhores Publicações do Programa (Nível 2)',
        quesito: '2',
        itemFicha: '2.4.3',
        pesoPercentual: 6,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPI2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando indicação de publicações Nível 2 pelo programa',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (denominadorEfetivo === 0) {
      return {
        id: 'dpi2',
        codigo: 'DPI2',
        nome: 'DPI das Melhores Publicações do Programa (Nível 2)',
        quesito: '2',
        itemFicha: '2.4.3',
        pesoPercentual: 6,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPI2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    const valor = Number((pontosNumerador / denominadorEfetivo).toFixed(3))
    return {
      id: 'dpi2',
      codigo: 'DPI2',
      nome: 'DPI das Melhores Publicações do Programa (Nível 2)',
      quesito: '2',
      itemFicha: '2.4.3',
      pesoPercentual: 6,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPI2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'A1 N2', descricao: 'Artigos A1 no Nível 2', valor: a1 },
        { termo: 'A2 N2', descricao: 'Artigos A2 no Nível 2', valor: a2 },
        { termo: 'A3 N2', descricao: 'Artigos A3 no Nível 2', valor: a3 },
        { termo: 'A4 N2', descricao: 'Artigos A4 no Nível 2', valor: a4 },
        {
          termo: 'min(B1, DP)',
          descricao: `B1 N2 saturado (${b1Bruto} brutos)`,
          valor: b1Saturado,
        },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- DPD (item 2.4.2): % DP com publicações A1 até A4 no ano/período ---
  const dpdIndicador: ResultadoIndicador = (() => {
    // Contar docentes permanentes que possuem ao menos 1 publicação A1-A4 no quadriênio
    const dpComPubsA1A4 = new Set<number>()

    for (const pub of pubsNoQuadrienio) {
      const e = (pub.estrato_qualis || '').toUpperCase().trim()
      if (['A1', 'A2', 'A3', 'A4'].includes(e)) {
        const info = pubPertenceADocentePermanente(pub)
        if (info.pertence) {
          for (const docId of info.docIds) {
            dpComPubsA1A4.add(docId)
          }
        }
      }
    }

    const totalComA1A4 = dpComPubsA1A4.size
    const insumos: InsumoStatus[] = [
      {
        totalEsperado: DP,
        totalExistente: totalComA1A4,
        descricao: `${totalComA1A4} de ${DP} docentes permanentes com publicação A1–A4 vinculada`,
        atendido: totalComA1A4 > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'dpd',
        codigo: 'DPD',
        nome: 'Distribuição de Publicações Qualificadas no Corpo Docente',
        quesito: '2',
        itemFicha: '2.4.2',
        pesoPercentual: 3,
        pesoQuesitoGeral: '25%',
        formulaTexto: 'DPD = (% dos DP com publicações A1–A4)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [
          { termo: 'DP com A1–A4', descricao: 'Docentes com artigos A1–A4', valor: 0 },
          { termo: 'DP Total', descricao: 'Total de permanentes (inclui JDP)', valor: 0 },
        ],
        insumos,
      }
    }

    const valor = Number(((totalComA1A4 / DP) * 100).toFixed(2))
    return {
      id: 'dpd',
      codigo: 'DPD',
      nome: 'Distribuição de Publicações Qualificadas no Corpo Docente',
      quesito: '2',
      itemFicha: '2.4.2',
      pesoPercentual: 3,
      pesoQuesitoGeral: '25%',
      formulaTexto: 'DPD = (% dos DP com publicações A1–A4)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        { termo: 'DP com A1–A4', descricao: 'Docentes com artigos A1–A4', valor: totalComA1A4 },
        { termo: 'DP Total', descricao: 'Total de permanentes (inclui JDP)', valor: DP },
      ],
      insumos,
    }
  })()

  // --- SO (item 2.5.1): % DP que tem orientações ativas no programa ---
  const soIndicador: ResultadoIndicador = (() => {
    // Orientações com status 'ativo' vinculadas a DP
    const idsDpComOriAtiva = new Set<number>()
    for (const ori of dados.orientacoes) {
      if (
        normStr(ori.status) === 'ativo' &&
        ori.docente_id &&
        idsPermanentesSet.has(ori.docente_id)
      ) {
        idsDpComOriAtiva.add(ori.docente_id)
      }
    }

    const qtd = idsDpComOriAtiva.size
    const insumos: InsumoStatus[] = [
      {
        totalEsperado: DP,
        totalExistente: qtd,
        descricao: `${qtd} de ${DP} docentes permanentes com orientações ativas no sistema`,
        atendido: qtd > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'so',
        codigo: 'SO',
        nome: 'Distribuição de Orientações Ativas (% DP com orientações)',
        quesito: '2',
        itemFicha: '2.5.1',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'SO = (% DP com orientações ativas no ano)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [],
        insumos,
      }
    }

    const valor = Number(((qtd / DP) * 100).toFixed(2))
    return {
      id: 'so',
      codigo: 'SO',
      nome: 'Distribuição de Orientações Ativas (% DP com orientações)',
      quesito: '2',
      itemFicha: '2.5.1',
      pesoPercentual: 2,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'SO = (% DP com orientações ativas no ano)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        {
          termo: 'DP com orientações ativas',
          descricao: 'Permanentes orientando discentes',
          valor: qtd,
        },
        { termo: 'DP Total', descricao: 'Total de permanentes', valor: DP },
      ],
      insumos,
    }
  })()

  // --- PSA (item 2.5.2): % DP SEM titulações M ou D no ano (exclui JDP) ---
  const psaIndicador: ResultadoIndicador = (() => {
    // Docentes permanentes REGULARES (excluindo JDP válidos)
    const permanentesRegulares = permanentes.filter(
      (d) => !resumoJdp.jdpValidos.some((j) => j.id === d.id),
    )
    const totalRegulares = permanentesRegulares.length

    // Docentes regulares com titulação no quadriênio
    const docsComTitulacao = new Set<number>()
    for (const ori of oriConcluidasNoQuadrienio) {
      if (isMestradoConcluido(ori) || isDoutoradoConcluido(ori)) {
        if (ori.docente_id) docsComTitulacao.add(ori.docente_id)
      }
    }

    const docsRegularesSemTitulacao = permanentesRegulares.filter(
      (d) => !docsComTitulacao.has(d.id),
    ).length

    const insumos: InsumoStatus[] = [
      {
        totalEsperado: totalRegulares,
        totalExistente: docsRegularesSemTitulacao,
        descricao: `${docsRegularesSemTitulacao} de ${totalRegulares} DP regulares sem titulação concluída no período`,
        atendido: true,
      },
    ]

    if (totalRegulares === 0) {
      return {
        id: 'psa',
        codigo: 'PSA',
        nome: 'Percentual de DP Sem Titulações (% DP sem defesas M/D)',
        quesito: '2',
        itemFicha: '2.5.2',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'PSA = (% DP sem titulações M ou D no período, exclui JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares cadastrados',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [],
        insumos,
      }
    }

    // Se não há nenhuma defesa concluída registrada no banco para ninguém
    if (M === 0 && D === 0) {
      return {
        id: 'psa',
        codigo: 'PSA',
        nome: 'Percentual de DP Sem Titulações (% DP sem defesas M/D)',
        quesito: '2',
        itemFicha: '2.5.2',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'PSA = (% DP sem titulações M ou D no período, exclui JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de defesas concluídas registradas no sistema (M=0 e D=0 no banco)',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [
          {
            termo: 'DP sem defesas',
            descricao: 'Permanentes regulares sem conclusão',
            valor: docsRegularesSemTitulacao,
          },
          { termo: 'DP regulares', descricao: 'Permanentes excluindo JDP', valor: totalRegulares },
        ],
        insumos,
      }
    }

    const valor = Number(((docsRegularesSemTitulacao / totalRegulares) * 100).toFixed(2))
    return {
      id: 'psa',
      codigo: 'PSA',
      nome: 'Percentual de DP Sem Titulações (% DP sem defesas M/D)',
      quesito: '2',
      itemFicha: '2.5.2',
      pesoPercentual: 2,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'PSA = (% DP sem titulações M ou D no período, exclui JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        {
          termo: 'DP sem defesas',
          descricao: 'Docentes regulares sem titulações',
          valor: docsRegularesSemTitulacao,
        },
        {
          termo: 'DP regulares',
          descricao: 'Docentes permanentes regulares',
          valor: totalRegulares,
        },
        {
          termo: 'JDP excluídos',
          descricao: 'Jovens Doutores excluídos desta métrica',
          valor: JDP_validos,
        },
      ],
      insumos,
    }
  })()

  // --- DP4A (item 2.5.3): % DP com as 4 atividades ---
  // (1: orientações ativas + 2: aulas PG + 3: projetos pesquisa + 4: publicações em periódicos)
  const dp4aIndicador: ResultadoIndicador = (() => {
    // 1. Docentes com orientações ativas
    const docsComOriAtiva = new Set<number>()
    for (const o of dados.orientacoes) {
      if (normStr(o.status) === 'ativo' && o.docente_id) {
        docsComOriAtiva.add(o.docente_id)
      }
    }

    // 2. Docentes com aulas de PG (disciplinas nível 'pos_graduacao' ou sem nível como pos)
    const docsComAulasPg = new Set<number>()
    for (const d of dados.disciplinas) {
      const niv = normStr(d.nivel)
      if (d.docente_id && (niv === 'pos_graduacao' || niv === '')) {
        docsComAulasPg.add(d.docente_id)
      }
    }

    // 3. Docentes com projetos de pesquisa (coordenador ou participante)
    const docsComProjetos = new Set<number>()
    for (const p of dados.projetos) {
      if (p.coordenador_id) docsComProjetos.add(p.coordenador_id)
    }
    for (const part of dados.projetosParticipantes) {
      if (part.docente_id) docsComProjetos.add(part.docente_id)
    }

    // 4. Docentes com publicações em periódicos
    const docsComPublicacoes = new Set<number>()
    for (const pub of pubsNoQuadrienio) {
      const info = pubPertenceADocentePermanente(pub)
      if (info.pertence) {
        for (const docId of info.docIds) {
          docsComPublicacoes.add(docId)
        }
      }
    }

    let dpCom4Atividades = 0
    for (const doc of permanentes) {
      const tem1 = docsComOriAtiva.has(doc.id)
      const tem2 = docsComAulasPg.has(doc.id)
      const tem3 = docsComProjetos.has(doc.id)
      const tem4 = docsComPublicacoes.has(doc.id)
      if (tem1 && tem2 && tem3 && tem4) {
        dpCom4Atividades++
      }
    }

    const insumos: InsumoStatus[] = [
      {
        totalEsperado: DP,
        totalExistente: dpCom4Atividades,
        descricao: `${dpCom4Atividades} de ${DP} permanentes com as 4 atividades simultâneas`,
        atendido: dpCom4Atividades > 0,
      },
      {
        totalExistente: docsComOriAtiva.size,
        descricao: `${docsComOriAtiva.size} docentes com orientações ativas`,
        atendido: docsComOriAtiva.size > 0,
      },
      {
        totalExistente: docsComAulasPg.size,
        descricao: `${docsComAulasPg.size} docentes com disciplinas de pós`,
        atendido: docsComAulasPg.size > 0,
      },
      {
        totalExistente: docsComProjetos.size,
        descricao: `${docsComProjetos.size} docentes com projetos de pesquisa`,
        atendido: docsComProjetos.size > 0,
      },
      {
        totalExistente: docsComPublicacoes.size,
        descricao: `${docsComPublicacoes.size} docentes com publicações`,
        atendido: docsComPublicacoes.size > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'dp4a',
        codigo: 'DP4A',
        nome: 'Equilíbrio nas 4 Atividades Principais (DP4A)',
        quesito: '2',
        itemFicha: '2.5.3',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'DP4A = (% DP com orientações + aulas PG + projetos + periódicos)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [],
        insumos,
      }
    }

    const valor = Number(((dpCom4Atividades / DP) * 100).toFixed(2))
    return {
      id: 'dp4a',
      codigo: 'DP4A',
      nome: 'Equilíbrio nas 4 Atividades Principais (DP4A)',
      quesito: '2',
      itemFicha: '2.5.3',
      pesoPercentual: 2,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'DP4A = (% DP com orientações + aulas PG + projetos + periódicos)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        {
          termo: 'DP 4 Atividades',
          descricao: 'Permanentes que cumprem as 4 dimensões',
          valor: dpCom4Atividades,
        },
        { termo: 'DP Total', descricao: 'Total de docentes permanentes', valor: DP },
        {
          termo: 'Docentes c/ Orientações',
          descricao: 'Dimensão 1 atendida',
          valor: docsComOriAtiva.size,
        },
        {
          termo: 'Docentes c/ Disciplinas PG',
          descricao: 'Dimensão 2 atendida',
          valor: docsComAulasPg.size,
        },
        {
          termo: 'Docentes c/ Projetos',
          descricao: 'Dimensão 3 atendida',
          valor: docsComProjetos.size,
        },
        {
          termo: 'Docentes c/ Publicações',
          descricao: 'Dimensão 4 atendida',
          valor: docsComPublicacoes.size,
        },
      ],
      insumos,
    }
  })()

  // --- ATI (item 2.5.4): (número de disciplinas de pós-graduação ministradas no ano) / DP ---
  const atiIndicador: ResultadoIndicador = (() => {
    // Disciplinas com nível 'pos_graduacao' vinculadas a DP
    const disciplinasPos = dados.disciplinas.filter((d) => {
      const niv = normStr(d.nivel)
      const vinculado = d.docente_id ? idsPermanentesSet.has(d.docente_id) : true
      return niv === 'pos_graduacao' && vinculado
    })

    const totalPos = disciplinasPos.length
    const insumos: InsumoStatus[] = [
      {
        totalExistente: totalPos,
        descricao: `${totalPos} disciplinas de pós-graduação com nível 'pos_graduacao' registradas`,
        atendido: totalPos > 0,
      },
      {
        totalExistente: DP,
        descricao: `Denominador DP: ${DP}`,
        atendido: DP > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'ati',
        codigo: 'ATI',
        nome: 'Participação em Disciplinas de Pós-Graduação (ATI)',
        quesito: '2',
        itemFicha: '2.5.4',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'ATI = (número de disciplinas PG ministradas no ano) / DP',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (totalPos === 0) {
      return {
        id: 'ati',
        codigo: 'ATI',
        nome: 'Participação em Disciplinas de Pós-Graduação (ATI)',
        quesito: '2',
        itemFicha: '2.5.4',
        pesoPercentual: 2,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'ATI = (número de disciplinas PG ministradas no ano) / DP',
        status: 'indefinido',
        motivoIndefinido:
          "aguardando insumo de disciplinas classificadas com nível='pos_graduacao'",
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'Disciplinas PG', descricao: "Disciplinas com nível='pos_graduacao'", valor: 0 },
          { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
        ],
        insumos,
      }
    }

    const valor = Number((totalPos / DP).toFixed(3))
    return {
      id: 'ati',
      codigo: 'ATI',
      nome: 'Participação em Disciplinas de Pós-Graduação (ATI)',
      quesito: '2',
      itemFicha: '2.5.4',
      pesoPercentual: 2,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'ATI = (número de disciplinas PG ministradas no ano) / DP',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        {
          termo: 'Disciplinas PG',
          descricao: 'Disciplinas de pós-graduação ministradas',
          valor: totalPos,
        },
        { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
      ],
      insumos,
    }
  })()

  // --- NICT (item 2.5.5): (IC + IT) / DP da tabela iniciacao_cientifica ---
  const nictIndicador: ResultadoIndicador = (() => {
    const ics = dados.iniciacoesCientificas || []
    const totalIcIt = ics.length

    let icCont = 0
    let itCont = 0
    for (const item of ics) {
      if (item.tipo === 'iniciacao_cientifica') icCont++
      else if (item.tipo === 'iniciacao_tecnologica') itCont++
    }

    const insumos: InsumoStatus[] = [
      {
        totalExistente: totalIcIt,
        descricao: `${totalIcIt} registros de IC/IT cadastrados na tabela iniciacao_cientifica (${icCont} IC, ${itCont} IT)`,
        atendido: totalIcIt > 0,
      },
      {
        totalExistente: DP,
        descricao: `Denominador DP: ${DP}`,
        atendido: DP > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'nict',
        codigo: 'NICT',
        nome: 'Alunos de Iniciação Científica e Tecnológica por Docente (NICT)',
        quesito: '2',
        itemFicha: '2.5.5',
        pesoPercentual: 1,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'NICT = (IC + IT) / DP',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (totalIcIt === 0) {
      return {
        id: 'nict',
        codigo: 'NICT',
        nome: 'Alunos de Iniciação Científica e Tecnológica por Docente (NICT)',
        quesito: '2',
        itemFicha: '2.5.5',
        pesoPercentual: 1,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'NICT = (IC + IT) / DP',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo na tabela de Iniciação Científica (iniciacao_cientifica vazia)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'IC + IT', descricao: 'Registros na tabela iniciacao_cientifica', valor: 0 },
          { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
        ],
        insumos,
      }
    }

    const valor = Number((totalIcIt / DP).toFixed(3))
    return {
      id: 'nict',
      codigo: 'NICT',
      nome: 'Alunos de Iniciação Científica e Tecnológica por Docente (NICT)',
      quesito: '2',
      itemFicha: '2.5.5',
      pesoPercentual: 1,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'NICT = (IC + IT) / DP',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        { termo: 'IC', descricao: 'Iniciação Científica', valor: icCont },
        { termo: 'IT', descricao: 'Iniciação Tecnológica', valor: itCont },
        { termo: 'IC + IT', descricao: 'Total de orientações de graduação', valor: totalIcIt },
        { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
      ],
      insumos,
    }
  })()

  // --- NDISC (item 2.5.5): % DP que não ministraram aulas de graduação no ano ---
  const ndiscIndicador: ResultadoIndicador = (() => {
    // Disciplinas de graduação vinculadas a DP
    const disciplinasGrad = dados.disciplinas.filter((d) => normStr(d.nivel) === 'graduacao')
    const docsComGrad = new Set<number>()
    for (const d of disciplinasGrad) {
      if (d.docente_id && idsPermanentesSet.has(d.docente_id)) {
        docsComGrad.add(d.docente_id)
      }
    }

    const docsSemGrad = permanentes.filter((d) => !docsComGrad.has(d.id)).length
    const insumos: InsumoStatus[] = [
      {
        totalExistente: disciplinasGrad.length,
        descricao: `${disciplinasGrad.length} disciplinas classificadas com nível='graduacao'`,
        atendido: disciplinasGrad.length > 0,
      },
      {
        totalEsperado: DP,
        totalExistente: docsSemGrad,
        descricao: `${docsSemGrad} de ${DP} docentes permanentes sem disciplina de graduação cadastrada`,
        atendido: true,
      },
    ]

    if (DP === 0) {
      return {
        id: 'ndisc',
        codigo: 'NDISC',
        nome: 'Percentual de DP Sem Aulas de Graduação (NDISC)',
        quesito: '2',
        itemFicha: '2.5.5',
        pesoPercentual: 1,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'NDISC = (% DP que não ministraram aulas de graduação no ano)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '%',
        decomposicao: [],
        insumos,
      }
    }

    if (disciplinasGrad.length === 0) {
      return {
        id: 'ndisc',
        codigo: 'NDISC',
        nome: 'Percentual de DP Sem Aulas de Graduação (NDISC)',
        quesito: '2',
        itemFicha: '2.5.5',
        pesoPercentual: 1,
        pesoQuesitoGeral: '10%',
        formulaTexto: 'NDISC = (% DP que não ministraram aulas de graduação no ano)',
        status: 'indefinido',
        motivoIndefinido: "aguardando insumo de disciplinas classificadas com nível='graduacao'",
        valorCalculado: null,
        unidade: '%',
        decomposicao: [
          { termo: 'Disciplinas Graduação', descricao: 'Disciplinas cadastradas', valor: 0 },
          { termo: 'DP Total', descricao: 'Docentes Permanentes', valor: DP },
        ],
        insumos,
      }
    }

    const valor = Number(((docsSemGrad / DP) * 100).toFixed(2))
    return {
      id: 'ndisc',
      codigo: 'NDISC',
      nome: 'Percentual de DP Sem Aulas de Graduação (NDISC)',
      quesito: '2',
      itemFicha: '2.5.5',
      pesoPercentual: 1,
      pesoQuesitoGeral: '10%',
      formulaTexto: 'NDISC = (% DP que não ministraram aulas de graduação no ano)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '%',
      decomposicao: [
        {
          termo: 'DP sem graduação',
          descricao: 'Docentes permanentes sem aulas de graduação',
          valor: docsSemGrad,
        },
        {
          termo: 'DP com graduação',
          descricao: 'Docentes atuando na graduação',
          valor: docsComGrad.size,
        },
        { termo: 'DP Total', descricao: 'Docentes Permanentes', valor: DP },
      ],
      insumos,
    }
  })()

  // =========================================================================
  // QUESITO 3.1: IMPACTO, PATENTES E BIBLIOMETRIA (ÍNDICE-H)
  // =========================================================================

  // Helper de pontuação de patentes:
  // [N(licenciadas) + 0,6*N(concedidas) + 0,3*N(depositadas)] / (DP - JDP)
  function calcularPontuacaoPatentes(patentesSubset: Patente[]): {
    licenciadas: number
    concedidas: number
    depositadas: number
    pontos: number
  } {
    let licenciadas = 0
    let concedidas = 0
    let depositadas = 0

    for (const pat of patentesSubset) {
      const st = normStr(pat.status)
      if (st === 'licenciamento' || st === 'licenciada' || st === 'licenciadas') {
        licenciadas++
      } else if (
        st === 'concessão' ||
        st === 'concessao' ||
        st === 'concedida' ||
        st === 'concedidas'
      ) {
        concedidas++
      } else if (st === 'pendente' || st === 'depositada' || st === 'depositadas') {
        depositadas++
      } else {
        depositadas++
      }
    }

    const pontos = Number((licenciadas + 0.6 * concedidas + 0.3 * depositadas).toFixed(3))
    return { licenciadas, concedidas, depositadas, pontos }
  }

  // --- DPPn: Patentes Nacionais (item 3.1.1) ---
  const dppnIndicador: ResultadoIndicador = (() => {
    // Patentes nacionais: com campo ambito='nacional' ou inpi começando com 'BR' ou padrão nacional
    const patentesNacionais = dados.patentes.filter((p) => {
      const amb = normStr((p as any).ambito)
      if (amb === 'nacional') return true
      if (amb === 'internacional') return false
      // Se não tem coluna preenchida, verificar INPI com prefixo BR
      const inpi = (p.inpi || '').toUpperCase().trim()
      return inpi.startsWith('BR') || inpi.length > 0
    })

    const { licenciadas, concedidas, depositadas, pontos } =
      calcularPontuacaoPatentes(patentesNacionais)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: patentesNacionais.length,
        descricao: `${patentesNacionais.length} patentes nacionais cadastradas (${depositadas} dep., ${concedidas} conc., ${licenciadas} lic.)`,
        atendido: patentesNacionais.length > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'dppn',
        codigo: 'DPPn',
        nome: 'Índice de Patentes Nacionais (DPPn)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 8,
        pesoQuesitoGeral: '30%',
        formulaTexto:
          'DPPn = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (patentesNacionais.length === 0) {
      return {
        id: 'dppn',
        codigo: 'DPPn',
        nome: 'Índice de Patentes Nacionais (DPPn)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 8,
        pesoQuesitoGeral: '30%',
        formulaTexto:
          'DPPn = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de patentes nacionais cadastradas na base',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'Patentes Nacionais', descricao: 'Total cadastradas', valor: 0 },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number((pontos / denominadorEfetivo).toFixed(3))
    return {
      id: 'dppn',
      codigo: 'DPPn',
      nome: 'Índice de Patentes Nacionais (DPPn)',
      quesito: '3.1',
      itemFicha: '3.1.1',
      pesoPercentual: 8,
      pesoQuesitoGeral: '30%',
      formulaTexto: 'DPPn = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        {
          termo: 'Depositadas (peso 0.3)',
          descricao: 'Patentes depositadas/pendentes',
          valor: depositadas,
        },
        { termo: 'Concedidas (peso 0.6)', descricao: 'Patentes com concessão', valor: concedidas },
        { termo: 'Licenciadas (peso 1.0)', descricao: 'Patentes licenciadas', valor: licenciadas },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontos },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- DPPi: Patentes Internacionais (item 3.1.1) ---
  const dppiIndicador: ResultadoIndicador = (() => {
    // Patentes internacionais: com campo ambito='internacional' ou inpi PCT/US/EP/WO
    const patentesInternacionais = dados.patentes.filter((p) => {
      const amb = normStr((p as any).ambito)
      if (amb === 'internacional') return true
      if (amb === 'nacional') return false
      const inpi = (p.inpi || '').toUpperCase().trim()
      return (
        inpi.startsWith('PCT') ||
        inpi.startsWith('US') ||
        inpi.startsWith('EP') ||
        inpi.startsWith('WO')
      )
    })

    const { licenciadas, concedidas, depositadas, pontos } =
      calcularPontuacaoPatentes(patentesInternacionais)

    const insumos: InsumoStatus[] = [
      {
        totalExistente: patentesInternacionais.length,
        descricao: `${patentesInternacionais.length} patentes internacionais cadastradas`,
        atendido: patentesInternacionais.length > 0,
      },
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ]

    if (denominadorEfetivo === 0) {
      return {
        id: 'dppi',
        codigo: 'DPPi',
        nome: 'Índice de Patentes Internacionais (DPPi)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '30%',
        formulaTexto:
          'DPPi = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (patentesInternacionais.length === 0) {
      return {
        id: 'dppi',
        codigo: 'DPPi',
        nome: 'Índice de Patentes Internacionais (DPPi)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 10,
        pesoQuesitoGeral: '30%',
        formulaTexto:
          'DPPi = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de patentes internacionais cadastradas (âmbito internacional vazio)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'Patentes Internacionais', descricao: 'Total cadastradas', valor: 0 },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
        insumos,
      }
    }

    const valor = Number((pontos / denominadorEfetivo).toFixed(3))
    return {
      id: 'dppi',
      codigo: 'DPPi',
      nome: 'Índice de Patentes Internacionais (DPPi)',
      quesito: '3.1',
      itemFicha: '3.1.1',
      pesoPercentual: 10,
      pesoQuesitoGeral: '30%',
      formulaTexto: 'DPPi = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP)',
      status: 'calculado',
      valorCalculado: valor,
      unidade: '',
      decomposicao: [
        {
          termo: 'Depositadas (peso 0.3)',
          descricao: 'Patentes internacionais depositadas',
          valor: depositadas,
        },
        {
          termo: 'Concedidas (peso 0.6)',
          descricao: 'Patentes internacionais concedidas',
          valor: concedidas,
        },
        {
          termo: 'Licenciadas (peso 1.0)',
          descricao: 'Patentes internacionais licenciadas',
          valor: licenciadas,
        },
        { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontos },
        { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
      ],
      insumos,
    }
  })()

  // --- BLOCO BIBLIOMÉTRICO: ÍNDICE-H DO CORPO DOCENTE (Scopus) ---
  // Docentes permanentes com índice H do Scopus
  // Indicadores:
  // - H2 do programa: número H2 de docentes permanentes com H >= H2 (equivalente ao índice h do grupo)
  // - Hmédio: média aritmética dos índices H dos DP
  // - Hmediano: mediana dos índices H dos DP
  // - % DP acima de H2: percentual de DP com índice H estritamente acima de H2 (ou >= H2 conforme decomposição)
  const dpIndicesH: number[] = permanentes
    .map((d) => (typeof d.indice_h === 'number' && !isNaN(d.indice_h) ? d.indice_h : 0))
    .sort((a, b) => b - a) // ordem decrescente

  const totalDpComHPositivo = dpIndicesH.filter((h) => h > 0).length

  // Cálculo do índice H2 do programa:
  // Maior valor inteiro H2 tal que existam pelo menos H2 docentes permanentes com indice_h >= H2
  let h2Programa = 0
  for (let i = 0; i < dpIndicesH.length; i++) {
    const rank = i + 1
    if (dpIndicesH[i] >= rank) {
      h2Programa = rank
    } else {
      break
    }
  }

  // Média
  const hMedio =
    dpIndicesH.length > 0
      ? Number((dpIndicesH.reduce((acc, v) => acc + v, 0) / dpIndicesH.length).toFixed(2))
      : 0

  // Mediana
  const hMediano = (() => {
    if (dpIndicesH.length === 0) return 0
    const meio = Math.floor(dpIndicesH.length / 2)
    if (dpIndicesH.length % 2 === 1) {
      return dpIndicesH[meio]
    }
    return Number(((dpIndicesH[meio - 1] + dpIndicesH[meio]) / 2).toFixed(1))
  })()

  // % DP acima de H2 (H > H2)
  const dpAcimaH2 = dpIndicesH.filter((h) => h > h2Programa).length
  const percAcimaH2 = DP > 0 ? Number(((dpAcimaH2 / DP) * 100).toFixed(2)) : 0

  const h2Indicador: ResultadoIndicador = (() => {
    const insumos: InsumoStatus[] = [
      {
        totalEsperado: DP,
        totalExistente: totalDpComHPositivo,
        descricao: `${totalDpComHPositivo} de ${DP} docentes permanentes com índice-h preenchido`,
        atendido: totalDpComHPositivo > 0,
      },
    ]

    if (DP === 0) {
      return {
        id: 'h2',
        codigo: 'H2',
        nome: 'Índice H2 do Programa (Engenharias II)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 12,
        pesoQuesitoGeral: '30%',
        formulaTexto: 'H2 = maior valor h tal que h docentes permanentes tenham índice H >= h',
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes cadastrados',
        valorCalculado: null,
        unidade: '',
        decomposicao: [],
        insumos,
      }
    }

    if (totalDpComHPositivo === 0) {
      return {
        id: 'h2',
        codigo: 'H2',
        nome: 'Índice H2 do Programa (Engenharias II)',
        quesito: '3.1',
        itemFicha: '3.1.1',
        pesoPercentual: 12,
        pesoQuesitoGeral: '30%',
        formulaTexto: 'H2 = maior valor h tal que h docentes permanentes tenham índice H >= h',
        status: 'indefinido',
        motivoIndefinido:
          'aguardando insumo de índice-h dos docentes (0 docentes com índice-h > 0)',
        valorCalculado: null,
        unidade: '',
        decomposicao: [
          { termo: 'DP com H cadastrado', descricao: 'Docentes com Scopus/OpenAlex ID', valor: 0 },
          { termo: 'DP Total', descricao: 'Docentes Permanentes', valor: DP },
        ],
        insumos,
      }
    }

    return {
      id: 'h2',
      codigo: 'H2',
      nome: 'Índice H2 do Programa (Engenharias II)',
      quesito: '3.1',
      itemFicha: '3.1.1',
      pesoPercentual: 12,
      pesoQuesitoGeral: '30%',
      formulaTexto: 'H2 = maior valor h tal que h docentes permanentes tenham índice H >= h',
      status: 'calculado',
      valorCalculado: h2Programa,
      unidade: '',
      decomposicao: [
        {
          termo: 'H2 do Programa',
          descricao: 'Docentes permanentes com H >= H2',
          valor: h2Programa,
        },
        { termo: 'H Médio', descricao: 'Média aritmética dos índices H do DP', valor: hMedio },
        { termo: 'H Mediano', descricao: 'Mediana dos índices H do DP', valor: hMediano },
        {
          termo: '% DP acima de H2',
          descricao: `Docentes com H > ${h2Programa} (${dpAcimaH2} de ${DP})`,
          valor: `${percAcimaH2}%`,
        },
        {
          termo: 'DP com H preenchido',
          descricao: 'Cobertura bibliométrica Scopus/OpenAlex',
          valor: `${totalDpComHPositivo}/${DP}`,
        },
      ],
      insumos,
      observacoes:
        'Definição oficial do Documento de Área Engenharias II (CAPES): número H2 de docentes permanentes com índice H >= H2.',
    }
  })()

  // Agrupamento em Quesitos
  const todosIndicadores: ResultadoIndicador[] = [
    adeIndicador,
    oriIndicador,
    atdIndicador,
    dpiIndicador,
    dptIndicador,
    dpide1Indicador,
    dpide2Indicador,
    dpi2Indicador,
    dpdIndicador,
    soIndicador,
    psaIndicador,
    dp4aIndicador,
    atiIndicador,
    nictIndicador,
    ndiscIndicador,
    dppnIndicador,
    dppiIndicador,
    h2Indicador,
  ]

  const quesito1: ResumoQuesito = {
    quesito: '1',
    titulo: 'Quesito 1 — Programa: Adequação e Perfil Docente',
    pesoTotalPercentual: 35,
    indicadores: [adeIndicador],
  }

  const quesito2: ResumoQuesito = {
    quesito: '2',
    titulo: 'Quesito 2 — Formação e Produção Intelectual',
    pesoTotalPercentual: 55, // soma dos pesos de formação (30%) + produção docente (25%)
    indicadores: [
      oriIndicador,
      atdIndicador,
      dpiIndicador,
      dptIndicador,
      dpide1Indicador,
      dpide2Indicador,
      dpi2Indicador,
      dpdIndicador,
      soIndicador,
      psaIndicador,
      dp4aIndicador,
      atiIndicador,
      nictIndicador,
      ndiscIndicador,
    ],
  }

  const quesito31: ResumoQuesito = {
    quesito: '3.1',
    titulo: 'Quesito 3.1 — Impacto, Propriedade Intelectual e Bibliometria',
    pesoTotalPercentual: 30,
    indicadores: [dppnIndicador, dppiIndicador, h2Indicador],
  }

  const calculados = todosIndicadores.filter((i) => i.status === 'calculado').length
  const indefinidos = todosIndicadores.filter((i) => i.status === 'indefinido').length

  return {
    anoReferencia,
    quadrienio: {
      inicio: anoInicio,
      fim: anoFim,
    },
    geradoEm: new Date().toISOString(),
    resumoGeral: {
      totalIndicadores: todosIndicadores.length,
      calculados,
      indefinidos,
      totalDP: DP,
      totalJdpValidos: JDP_validos,
      denominadorEfetivo,
    },
    quesitos: [quesito1, quesito2, quesito31],
    todosIndicadores,
  }
}
