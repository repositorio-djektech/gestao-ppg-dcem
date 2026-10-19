import { ANO_INICIO, ANO_FIM } from '../reconducao/types'
import {
  extrairAnoDeData,
  isMestradoConcluido,
  isDoutoradoConcluido,
  orientacaoNoPeriodo,
  obterAnoOrientacaoDefesa,
} from '../reconducao/calculo'
import { calcularResumoJdpPrograma } from './jdp'
import type { Docente, Orientacao, Disciplina, Publicacao, Patente } from '@/types/database'
import type {
  DadosEntradaIndicadores,
  ResultadoIndicador,
  ResultadoAnoIndicador,
  RelatorioIndicadoresCapes,
  ResumoQuesito,
  InsumoStatus,
  TermoDecomposicao,
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
 * Extrai ano de patente (a partir de created_at, observações ou inpi)
 */
function anoPatente(pat: Patente): number | null {
  if (pat.created_at) {
    const a = extrairAnoDeData(pat.created_at)
    if (a) return a
  }
  if (pat.observacoes) {
    const a = extrairAnoDeData(pat.observacoes)
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
 * Agrega resultados anuais calculando a MMA (Média das Médias Anuais).
 * Regras prescritivas:
 * - Anos sem insumo ficam 'indefinido' e NÃO entram como 0 na média.
 * - A MMA calcula a média aritmética dos anos válidos (com insumo calculado).
 * - Se nenhum ano tiver insumo, MMA é nula e o indicador fica indefinido.
 * - completo: true somente se todos os 4 anos (2025..2028) estiverem calculados.
 */
function agregarComMMA(
  anosResultados: Record<number, ResultadoAnoIndicador>,
  anosQuadrienio: number[],
  metodologia: 'anual_mma' | 'quadrienio_mma',
  baseIndicador: Omit<
    ResultadoIndicador,
    'status' | 'valorCalculado' | 'anos' | 'mma' | 'metodologia'
  >,
): ResultadoIndicador {
  const anosCalculados = anosQuadrienio.filter((a) => anosResultados[a]?.status === 'calculado')
  const anosAguardando = anosQuadrienio.filter((a) => anosResultados[a]?.status !== 'calculado')

  const completo = anosCalculados.length === anosQuadrienio.length

  let valorMMA: number | null = null
  if (anosCalculados.length > 0) {
    const soma = anosCalculados.reduce((acc, a) => acc + (anosResultados[a].valorCalculado ?? 0), 0)
    valorMMA = Number((soma / anosCalculados.length).toFixed(3))
  }

  const regra =
    anosCalculados.length === 0
      ? 'Aguardando insumo em todos os anos do quadriênio'
      : completo
        ? `Média das 4 médias anuais (MMA 2025–2028: ${anosCalculados.join(', ')})`
        : `Média parcial dos anos com insumo (${anosCalculados.join(', ')}); aguardando: ${anosAguardando.join(', ')}`

  // Decomposição agregada trazendo a MMA e resumo dos anos
  const decomposicaoAgregada: TermoDecomposicao[] = [
    ...baseIndicador.decomposicao,
    {
      termo: 'MMA',
      descricao: completo
        ? 'Média das 4 médias anuais (2025-2028)'
        : `Média parcial dos anos com insumo (${anosCalculados.length}/${anosQuadrienio.length} anos)`,
      valor: valorMMA !== null ? valorMMA : '—',
    },
  ]

  const status = valorMMA !== null ? 'calculado' : 'indefinido'
  const motivoIndefinido =
    status === 'indefinido'
      ? baseIndicador.motivoIndefinido ||
        `aguardando insumos no quadriênio (${anosQuadrienio.join(', ')})`
      : undefined

  return {
    ...baseIndicador,
    status,
    valorCalculado: valorMMA,
    motivoIndefinido,
    metodologia,
    decomposicao: decomposicaoAgregada,
    anos: anosResultados,
    mma: {
      valor: valorMMA,
      anosConsiderados: anosCalculados,
      anosAguardando,
      completo,
      regra,
    },
  }
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

  const anosQuadrienio: number[] = []
  for (let a = anoInicio; a <= anoFim; a++) {
    anosQuadrienio.push(a)
  }

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
    // Via vínculo estruturado
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
  // HELPER: Pontuação Qualis com saturação em B1
  // DPI / DPIDE1 / DPIDE2 / DPI2
  // Pesos: A1=1.0, A2=0.875, A3=0.75, A4=0.675, B1=0.5 (sat: min(B1, DP)), B2..C=0.0
  // =========================================================================
  function calcularPontuacaoQualisComSaturacao(
    publicacoesSubset: Publicacao[],
    somarPorDocentePermanente = false,
  ): {
    a1: number
    a2: number
    a3: number
    a4: number
    b1Bruto: number
    b1Saturado: number
    b2: number
    b3: number
    b4: number
    c: number
    pontosNumerador: number
  } {
    let a1 = 0
    let a2 = 0
    let a3 = 0
    let a4 = 0
    let b1Bruto = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let c = 0

    for (const p of publicacoesSubset) {
      const e = (p.estrato_qualis || '').toUpperCase().trim()
      const fatorMultiplicador = somarPorDocentePermanente
        ? Math.max(1, pubPertenceADocentePermanente(p).docIds.length)
        : 1

      if (e === 'A1') a1 += fatorMultiplicador
      else if (e === 'A2') a2 += fatorMultiplicador
      else if (e === 'A3') a3 += fatorMultiplicador
      else if (e === 'A4') a4 += fatorMultiplicador
      else if (e === 'B1') b1Bruto += fatorMultiplicador
      else if (e === 'B2') b2 += fatorMultiplicador
      else if (e === 'B3') b3 += fatorMultiplicador
      else if (e === 'B4') b4 += fatorMultiplicador
      else if (e === 'C') c += fatorMultiplicador
    }

    const b1Saturado = Math.min(b1Bruto, DP)
    const pontosNumerador = Number(
      (a1 + 0.875 * a2 + 0.75 * a3 + 0.675 * a4 + 0.5 * b1Saturado).toFixed(3),
    )

    return { a1, a2, a3, a4, b1Bruto, b1Saturado, b2, b3, b4, c, pontosNumerador }
  }

  // =========================================================================
  // HELPER: Pontuação de patentes
  // [N(licenciadas) + 0,6*N(concedidas) + 0,3*N(depositadas)] / (DP - JDP)
  // =========================================================================
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

  // =========================================================================
  // QUESITO 1: ADE (ESTOQUE)
  // ADE = DP / (DP + DC + DV) — sem anualização
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
        metodologia: 'estoque',
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
      metodologia: 'estoque',
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
        'Indicador de estoque (sem anualização): a ficha CAPES avalia a proporção estrutural de DP no corpo docente (mínimo 50% para conceito MB/B).',
    }
  })()

  // =========================================================================
  // QUESITO 2: INDICADORES "NO ANO" (SO, PSA, DP4A, ATI, NICT, NDISC, DPD)
  // Regra 1: calcular ANO a ANO (2025, 2026, 2027, 2028) e agregar pela MMA.
  // Regra 4: ano sem insumo fica indefinido e NÃO entra como 0 na média.
  // =========================================================================

  // Docentes permanentes regulares (para PSA)
  const permanentesRegulares = permanentes.filter(
    (d) => !resumoJdp.jdpValidos.some((j) => j.id === d.id),
  )
  const totalRegulares = permanentesRegulares.length

  // Helper para verificar se uma disciplina pertence ao ano informado
  const discNoAno = (d: Disciplina, ano: number): boolean => {
    const a = extrairAnoDeData(d.ano_semestre)
    return a === ano
  }

  // Helper para verificar se IC/IT pertence ao ano informado
  const icNoAno = (ic: any, ano: number): boolean => {
    if (typeof ic.ano === 'number' && !isNaN(ic.ano)) return ic.ano === ano
    const a = extrairAnoDeData(ic.ano)
    return a === ano
  }

  // --- DPD: % DP com publicações A1 até A4 no ano ---
  const dpdAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    const pubsAno = dados.publicacoes.filter((p) => anoPublicacao(p) === ano)
    const pubsAnoComQualis = pubsAno.filter((p) => Boolean((p.estrato_qualis || '').trim()))

    if (DP === 0) {
      dpdAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
    } else if (pubsAno.length === 0 || pubsAnoComQualis.length === 0) {
      dpdAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de publicações com Qualis no ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const dpComA1A4 = new Set<number>()
      for (const pub of pubsAno) {
        const e = (pub.estrato_qualis || '').toUpperCase().trim()
        if (['A1', 'A2', 'A3', 'A4'].includes(e)) {
          const info = pubPertenceADocentePermanente(pub)
          if (info.pertence) {
            for (const docId of info.docIds) dpComA1A4.add(docId)
          }
        }
      }
      const val = Number(((dpComA1A4.size / DP) * 100).toFixed(2))
      dpdAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'DP com A1–A4',
            descricao: `Docentes com A1-A4 em ${ano}`,
            valor: dpComA1A4.size,
          },
          { termo: 'DP Total', descricao: 'Total de permanentes', valor: DP },
        ],
      }
    }
  }

  const dpdIndicador = agregarComMMA(dpdAnos, anosQuadrienio, 'anual_mma', {
    id: 'dpd',
    codigo: 'DPD',
    nome: 'Distribuição de Publicações Qualificadas no Corpo Docente (DPD)',
    quesito: '2',
    itemFicha: '2.4.2',
    pesoPercentual: 3,
    pesoQuesitoGeral: '25%',
    formulaTexto: 'DPD = (% dos DP com publicações A1–A4 no ano) → MMA do quadriênio',
    unidade: '%',
    decomposicao: [{ termo: 'DP Total', descricao: 'Total de permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes (DP, inclui JDP)`,
        atendido: DP > 0,
      },
    ],
    observacoes:
      'Calculado ano a ano pela ficha CAPES; a agregação do quadriênio é obtida pela Média das Médias Anuais (MMA). Anos sem insumo cadastrado não entram como zero.',
  })

  // --- SO: % DP que tem orientações ativas no programa no ano ---
  const soAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (DP === 0) {
      soAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    // Orientações ativas no ano (seja por status 'ativo' ou vigência temporal)
    const ativasAno = dados.orientacoes.filter((ori) => {
      if (normStr(ori.status) !== 'ativo') return false
      const ini = extrairAnoDeData(ori.inicio)
      const fim = extrairAnoDeData(ori.fim) || extrairAnoDeData(ori.data_defesa)
      if (ini !== null && fim !== null) {
        return ano >= ini && ano <= fim
      }
      if (ini !== null) return ano >= ini
      return true
    })

    const dpComOri = new Set<number>()
    for (const ori of ativasAno) {
      if (ori.docente_id && idsPermanentesSet.has(ori.docente_id)) {
        dpComOri.add(ori.docente_id)
      }
    }

    // Se nenhuma orientação ativa cadastrada em geral no sistema para o ano
    if (ativasAno.length === 0) {
      soAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de orientações ativas cadastradas em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const val = Number(((dpComOri.size / DP) * 100).toFixed(2))
      soAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'DP com orientações ativas',
            descricao: `Docentes orientando em ${ano}`,
            valor: dpComOri.size,
          },
          { termo: 'DP Total', descricao: 'Total de permanentes', valor: DP },
        ],
      }
    }
  }

  const soIndicador = agregarComMMA(soAnos, anosQuadrienio, 'anual_mma', {
    id: 'so',
    codigo: 'SO',
    nome: 'Distribuição de Orientações Ativas (% DP com orientações)',
    quesito: '2',
    itemFicha: '2.5.1',
    pesoPercentual: 2,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'SO = (% DP com orientações ativas no ano) → MMA do quadriênio',
    unidade: '%',
    decomposicao: [{ termo: 'DP Total', descricao: 'Total de permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes`,
        atendido: DP > 0,
      },
    ],
    observacoes:
      'Calculado ano a ano conforme a Ficha CAPES; a agregação final segue a MMA das taxas anuais.',
  })

  // --- PSA: % DP SEM titulações M ou D no ano (exclui JDP) ---
  const psaAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (totalRegulares === 0) {
      psaAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    // Defesas M ou D concluídas exatamente no ano
    const defesasAno = dados.orientacoes.filter((ori) => {
      const a = obterAnoOrientacaoDefesa(ori)
      const concluida =
        normStr(ori.status) === 'concluido' ||
        normStr(ori.status) === 'titulado' ||
        Boolean(ori.data_defesa)
      return a === ano && concluida && (isMestradoConcluido(ori) || isDoutoradoConcluido(ori))
    })

    if (defesasAno.length === 0) {
      // Ano sem defesas cadastradas no banco
      psaAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de defesas concluídas em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const docsComDefesa = new Set<number>()
      for (const ori of defesasAno) {
        if (ori.docente_id) docsComDefesa.add(ori.docente_id)
      }
      const docsSemDefesa = permanentesRegulares.filter((d) => !docsComDefesa.has(d.id)).length
      const val = Number(((docsSemDefesa / totalRegulares) * 100).toFixed(2))

      psaAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'DP sem defesas',
            descricao: `Permanentes regulares sem titulação em ${ano}`,
            valor: docsSemDefesa,
          },
          { termo: 'DP regulares', descricao: 'Permanentes excluindo JDP', valor: totalRegulares },
        ],
      }
    }
  }

  const psaIndicador = agregarComMMA(psaAnos, anosQuadrienio, 'anual_mma', {
    id: 'psa',
    codigo: 'PSA',
    nome: 'Percentual de DP Sem Titulações (% DP sem defesas M/D)',
    quesito: '2',
    itemFicha: '2.5.2',
    pesoPercentual: 2,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'PSA = (% DP sem titulações M ou D no ano, exclui JDP) → MMA do quadriênio',
    unidade: '%',
    decomposicao: [
      { termo: 'DP regulares', descricao: 'Permanentes excluindo JDP', valor: totalRegulares },
    ],
    insumos: [
      {
        totalExistente: totalRegulares,
        descricao: `${totalRegulares} docentes permanentes regulares cadastrados`,
        atendido: totalRegulares > 0,
      },
    ],
    observacoes:
      'Calculado ano a ano e agregado pela MMA. Exclui Jovens Doutores Pesquisadores (JDP) conforme item 2.5.2 da ficha.',
  })

  // --- DP4A: % DP com as 4 atividades simultâneas no ano ---
  // (1: orientações ativas + 2: aulas PG + 3: projetos de pesquisa + 4: publicações em periódicos)
  const dp4aAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (DP === 0) {
      dp4aAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    // 1. Orientações ativas no ano
    const docsOri = new Set<number>()
    for (const o of dados.orientacoes) {
      if (normStr(o.status) === 'ativo' && o.docente_id) {
        const ini = extrairAnoDeData(o.inicio)
        const fim = extrairAnoDeData(o.fim) || extrairAnoDeData(o.data_defesa)
        const noAno =
          ini !== null && fim !== null ? ano >= ini && ano <= fim : ini !== null ? ano >= ini : true
        if (noAno) docsOri.add(o.docente_id)
      }
    }

    // 2. Disciplinas de pós no ano
    const docsPg = new Set<number>()
    for (const d of dados.disciplinas) {
      const niv = normStr(d.nivel)
      if (d.docente_id && (niv === 'pos_graduacao' || niv === '')) {
        if (discNoAno(d, ano)) {
          docsPg.add(d.docente_id)
        }
      }
    }

    // 3. Projetos de pesquisa no ano
    const docsProj = new Set<number>()
    for (const p of dados.projetos) {
      const ini = extrairAnoDeData(p.inicio)
      const fim = extrairAnoDeData(p.fim)
      const noAno =
        ini !== null && fim !== null ? ano >= ini && ano <= fim : ini !== null ? ano <= ano : true
      if (noAno) {
        if (p.coordenador_id) docsProj.add(p.coordenador_id)
      }
    }
    for (const part of dados.projetosParticipantes) {
      if (part.docente_id) docsProj.add(part.docente_id)
    }

    // 4. Publicações em periódicos no ano
    const docsPub = new Set<number>()
    const pubsAno = dados.publicacoes.filter((p) => anoPublicacao(p) === ano)
    for (const pub of pubsAno) {
      const info = pubPertenceADocentePermanente(pub)
      if (info.pertence) {
        for (const docId of info.docIds) docsPub.add(docId)
      }
    }

    // Verificação de insumo no ano: pelo menos uma atividade registrada no ano
    const insumosPresentes = docsOri.size > 0 || docsPg.size > 0 || docsPub.size > 0
    if (!insumosPresentes) {
      dp4aAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de atividades cadastradas para o ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      let com4 = 0
      for (const doc of permanentes) {
        if (
          docsOri.has(doc.id) &&
          docsPg.has(doc.id) &&
          docsProj.has(doc.id) &&
          docsPub.has(doc.id)
        ) {
          com4++
        }
      }
      const val = Number(((com4 / DP) * 100).toFixed(2))
      dp4aAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'DP 4 Atividades',
            descricao: `Permanentes nas 4 atividades em ${ano}`,
            valor: com4,
          },
          { termo: 'DP Total', descricao: 'Total de permanentes', valor: DP },
        ],
      }
    }
  }

  const dp4aIndicador = agregarComMMA(dp4aAnos, anosQuadrienio, 'anual_mma', {
    id: 'dp4a',
    codigo: 'DP4A',
    nome: 'Equilíbrio nas 4 Atividades Principais (DP4A)',
    quesito: '2',
    itemFicha: '2.5.3',
    pesoPercentual: 2,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'DP4A = (% DP com orientações + aulas PG + projetos + periódicos no ano) → MMA',
    unidade: '%',
    decomposicao: [{ termo: 'DP Total', descricao: 'Total de permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes cadastrados`,
        atendido: DP > 0,
      },
    ],
    observacoes:
      'Calculado ano a ano e agregado pela MMA. Avalia os permanentes com atuação simultânea nas 4 dimensões no ano.',
  })

  // --- ATI: (número de disciplinas de pós-graduação ministradas no ano) / DP ---
  const atiAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (DP === 0) {
      atiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const disciplinasPosAno = dados.disciplinas.filter((d) => {
      const niv = normStr(d.nivel)
      const vinculado = d.docente_id ? idsPermanentesSet.has(d.docente_id) : true
      return (niv === 'pos_graduacao' || niv === '') && vinculado && discNoAno(d, ano)
    })

    if (disciplinasPosAno.length === 0) {
      atiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de disciplinas de pós-graduação ministradas em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const val = Number((disciplinasPosAno.length / DP).toFixed(3))
      atiAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'Disciplinas PG',
            descricao: `Disciplinas de pós em ${ano}`,
            valor: disciplinasPosAno.length,
          },
          { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
        ],
      }
    }
  }

  const atiIndicador = agregarComMMA(atiAnos, anosQuadrienio, 'anual_mma', {
    id: 'ati',
    codigo: 'ATI',
    nome: 'Participação em Disciplinas de Pós-Graduação (ATI)',
    quesito: '2',
    itemFicha: '2.5.4',
    pesoPercentual: 2,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'ATI = (disciplinas PG ministradas no ano) / DP → MMA do quadriênio',
    unidade: '',
    decomposicao: [{ termo: 'DP', descricao: 'Docentes Permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes cadastrados`,
        atendido: DP > 0,
      },
    ],
    observacoes:
      'Calculado ano a ano e consolidado via MMA conforme a ficha de avaliação da área Engenharias II.',
  })

  // --- NICT: (IC + IT no ano) / DP ---
  const nictAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (DP === 0) {
      nictAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const icsAno = (dados.iniciacoesCientificas || []).filter((ic) => icNoAno(ic, ano))

    if (icsAno.length === 0) {
      nictAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de IC/IT cadastrados no ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const icCont = icsAno.filter((i) => i.tipo === 'iniciacao_cientifica').length
      const itCont = icsAno.filter((i) => i.tipo === 'iniciacao_tecnologica').length
      const val = Number((icsAno.length / DP).toFixed(3))

      nictAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'IC', descricao: `Iniciação Científica em ${ano}`, valor: icCont },
          { termo: 'IT', descricao: `Iniciação Tecnológica em ${ano}`, valor: itCont },
          { termo: 'IC + IT', descricao: `Total de IC/IT em ${ano}`, valor: icsAno.length },
          { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
        ],
      }
    }
  }

  const nictIndicador = agregarComMMA(nictAnos, anosQuadrienio, 'anual_mma', {
    id: 'nict',
    codigo: 'NICT',
    nome: 'Alunos de Iniciação Científica e Tecnológica por Docente (NICT)',
    quesito: '2',
    itemFicha: '2.5.5',
    pesoPercentual: 1,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'NICT = (IC + IT no ano) / DP → MMA do quadriênio',
    unidade: '',
    decomposicao: [{ termo: 'DP', descricao: 'Docentes Permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes cadastrados`,
        atendido: DP > 0,
      },
    ],
    observacoes: 'Calculado ano a ano e consolidado via MMA conforme item 2.5.5 da Ficha CAPES.',
  })

  // --- NDISC: % DP que não ministraram aulas de graduação no ano ---
  const ndiscAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (DP === 0) {
      ndiscAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const disciplinasGradAno = dados.disciplinas.filter(
      (d) => normStr(d.nivel) === 'graduacao' && discNoAno(d, ano),
    )

    if (disciplinasGradAno.length === 0) {
      ndiscAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de disciplinas de graduação ministradas em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const docsComGrad = new Set<number>()
      for (const d of disciplinasGradAno) {
        if (d.docente_id && idsPermanentesSet.has(d.docente_id)) {
          docsComGrad.add(d.docente_id)
        }
      }
      const docsSemGrad = permanentes.filter((d) => !docsComGrad.has(d.id)).length
      const val = Number(((docsSemGrad / DP) * 100).toFixed(2))

      ndiscAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'DP sem graduação',
            descricao: `Permanentes sem graduação em ${ano}`,
            valor: docsSemGrad,
          },
          {
            termo: 'DP com graduação',
            descricao: `Permanentes na graduação em ${ano}`,
            valor: docsComGrad.size,
          },
          { termo: 'DP Total', descricao: 'Docentes Permanentes', valor: DP },
        ],
      }
    }
  }

  const ndiscIndicador = agregarComMMA(ndiscAnos, anosQuadrienio, 'anual_mma', {
    id: 'ndisc',
    codigo: 'NDISC',
    nome: 'Percentual de DP Sem Aulas de Graduação (NDISC)',
    quesito: '2',
    itemFicha: '2.5.5',
    pesoPercentual: 1,
    pesoQuesitoGeral: '10%',
    formulaTexto: 'NDISC = (% DP que não ministraram aulas de graduação no ano) → MMA',
    unidade: '%',
    decomposicao: [{ termo: 'DP Total', descricao: 'Docentes Permanentes', valor: DP }],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes cadastrados`,
        atendido: DP > 0,
      },
    ],
    observacoes: 'Calculado ano a ano e consolidado via MMA conforme item 2.5.5 da Ficha CAPES.',
  })

  // =========================================================================
  // QUESITO 2 & 3.1: INDICADORES DE QUADRIÊNIO COM DECISÃO DE MMA DO PROGRAMA
  // Regra 2: ORI, ATD, DPI, DPT, DPIDE1, DPIDE2, DPI2, DPPn, DPPi também com MMA
  // (média das 4 médias anuais) — decisão formal do PPG-DCEM documentada nas notas.
  // =========================================================================

  // --- ORI: (M + 3D) / (DP − JDP) ---
  const oriAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      oriAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares (DP - JDP = 0)',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const orisAno = oriConcluidasNoQuadrienio.filter((o) => obterAnoOrientacaoDefesa(o) === ano)
    const mAno = orisAno.filter(isMestradoConcluido).length
    const dAno = orisAno.filter(isDoutoradoConcluido).length

    if (mAno === 0 && dAno === 0) {
      oriAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de titulações concluídas no ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const val = Number(((mAno + 3 * dAno) / denominadorEfetivo).toFixed(3))
      oriAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'M', descricao: `Mestrados em ${ano}`, valor: mAno },
          { termo: 'D', descricao: `Doutorados em ${ano}`, valor: dAno },
          { termo: 'M + 3D', descricao: 'Numerador ponderado', valor: mAno + 3 * dAno },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const oriIndicador = agregarComMMA(oriAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'ori',
    codigo: 'ORI',
    nome: 'Taxa de Titulações Concluídas por Docente Permanente (ORI)',
    quesito: '2',
    itemFicha: '2.1.1',
    pesoPercentual: 10,
    pesoQuesitoGeral: '30%',
    formulaTexto: 'ORI = (M + 3D) / (DP − JDP) [Fórmula anual → MMA do quadriênio]',
    unidade: '',
    decomposicao: [
      { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
      { termo: 'JDP', descricao: 'JDP válidos (subtraídos do denominador)', valor: JDP_validos },
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes (${JDP_validos} JDP válidos)`,
        atendido: DP > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define ORI originalmente como total do quadriênio. Por decisão formal do PPG-DCEM, adota-se o cálculo anual com consolidação via MMA (Média das Médias Anuais) para acompanhamento da evolução temporal do programa.',
  })

  // --- ATD: artigos A1-A4 com coautoria confirmada discente/egresso / (M + 2D) ---
  const atdAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    const orisAno = oriConcluidasNoQuadrienio.filter((o) => obterAnoOrientacaoDefesa(o) === ano)
    const mAno = orisAno.filter(isMestradoConcluido).length
    const dAno = orisAno.filter(isDoutoradoConcluido).length
    const denAtdAno = mAno + 2 * dAno

    const pubsAno = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      const estrato = (p.estrato_qualis || '').toUpperCase()
      const isA1A4 = ['A1', 'A2', 'A3', 'A4'].includes(estrato)
      const temCoautoria = mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true
      return isA1A4 && temCoautoria
    })

    if (denAtdAno === 0) {
      atdAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de titulações concluídas no ano ${ano} (M+2D=0)`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const val = Number((pubsAno.length / denAtdAno).toFixed(3))
      atdAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'Artigos A1-A4 c/ coautoria',
            descricao: `Artigos qualificados em ${ano}`,
            valor: pubsAno.length,
          },
          { termo: 'M', descricao: `Mestrados em ${ano}`, valor: mAno },
          { termo: 'D', descricao: `Doutorados em ${ano}`, valor: dAno },
          { termo: 'M + 2D', descricao: 'Denominador de titulações', valor: denAtdAno },
        ],
      }
    }
  }

  const atdIndicador = agregarComMMA(atdAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'atd',
    codigo: 'ATD',
    nome: 'Artigos A1–A4 com Discentes/Egressos por Titulação (ATD)',
    quesito: '2',
    itemFicha: '2.1.2',
    pesoPercentual: 10,
    pesoQuesitoGeral: '30%',
    formulaTexto: 'ATD = (artigos A1–A4 c/ coautoria discente/egresso) / (M + 2D) [Anual → MMA]',
    unidade: '',
    decomposicao: [],
    insumos: [
      {
        totalExistente: pubsNoQuadrienio.length,
        descricao: `${pubsNoQuadrienio.length} publicações no quadriênio`,
        atendido: pubsNoQuadrienio.length > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define ATD originalmente como total do quadriênio. Por decisão formal do PPG-DCEM, adota-se o cálculo anual com agregação MMA para monitoramento contínuo.',
  })

  // --- DPI: Produção dos DPs no ano ---
  const dpiAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dpiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const pubsAno = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      const tp = normStr(p.tipo_producao)
      const isPeriodico = tp === '' || tp === 'artigo em periódico' || Boolean(p.periodico)
      if (!isPeriodico) return false
      return pubPertenceADocentePermanente(p).pertence
    })

    const pubsAnoComQualis = pubsAno.filter((p) => Boolean((p.estrato_qualis || '').trim()))

    if (pubsAno.length === 0 || pubsAnoComQualis.length === 0) {
      dpiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de artigos com Qualis em periódicos em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { a1, a2, a3, a4, b1Bruto, b1Saturado, b2, b3, b4, c, pontosNumerador } =
        calcularPontuacaoQualisComSaturacao(pubsAno, true)
      const val = Number((pontosNumerador / denominadorEfetivo).toFixed(3))

      dpiAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'A1 (peso 1.0)', descricao: 'Artigos A1 somados por docente', valor: a1 },
          { termo: 'A2 (peso 0.875)', descricao: 'Artigos A2 somados por docente', valor: a2 },
          { termo: 'A3 (peso 0.75)', descricao: 'Artigos A3 somados por docente', valor: a3 },
          { termo: 'A4 (peso 0.675)', descricao: 'Artigos A4 somados por docente', valor: a4 },
          {
            termo: 'min(B1, DP) (peso 0.5)',
            descricao: `B1 saturado (${b1Bruto} brutos, teto ${DP})`,
            valor: b1Saturado,
          },
          { termo: 'B2..C', descricao: 'Artigos sem pontuação', valor: b2 + b3 + b4 + c },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dpiIndicador = agregarComMMA(dpiAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dpi',
    codigo: 'DPI',
    nome: 'Índice de Produção Docente Ponderada (DPI)',
    quesito: '2',
    itemFicha: '2.4.1',
    pesoPercentual: 6,
    pesoQuesitoGeral: '25%',
    formulaTexto: 'DPI = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define DPI originalmente como total do quadriênio. Por decisão formal do programa PPG-DCEM, calcula-se anualmente com consolidação via MMA (Média das Médias Anuais), aplicando saturação em B1 e pesos oficiais.',
  })

  // --- DPT: artigos completos (periódicos + anais) + capítulos / (DP − JDP) ---
  const dptAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dptAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const pubsAno = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      return pubPertenceADocentePermanente(p).pertence
    })

    if (pubsAno.length === 0) {
      dptAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de produções vinculadas a DP no ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      let periodicos = 0
      let anais = 0
      let capitulos = 0
      for (const p of pubsAno) {
        const docsVinculadosQtd = Math.max(1, pubPertenceADocentePermanente(p).docIds.length)
        const tp = normStr(p.tipo_producao)
        if (tp === 'artigo em periódico' || tp === '' || Boolean(p.periodico)) {
          periodicos += docsVinculadosQtd
        } else if (tp === 'trabalho em anais') {
          anais += docsVinculadosQtd
        } else if (tp === 'capítulo') {
          capitulos += docsVinculadosQtd
        } else {
          periodicos += docsVinculadosQtd
        }
      }
      const totalItens = periodicos + anais + capitulos
      const val = Number((totalItens / denominadorEfetivo).toFixed(3))

      dptAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'Periódicos', descricao: `Periódicos em ${ano}`, valor: periodicos },
          { termo: 'Anais', descricao: `Anais em ${ano}`, valor: anais },
          { termo: 'Capítulos', descricao: `Capítulos em ${ano}`, valor: capitulos },
          { termo: 'Total', descricao: 'Soma ponderada por docente', valor: totalItens },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dptIndicador = agregarComMMA(dptAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dpt',
    codigo: 'DPT',
    nome: 'Índice de Produção Total dos Docentes (DPT)',
    quesito: '2',
    itemFicha: '2.4.1',
    pesoPercentual: 2,
    pesoQuesitoGeral: '25%',
    formulaTexto: 'DPT = (artigos completos + anais + capítulos) / (DP − JDP) [Anual → MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define DPT originalmente como total do quadriênio. Por decisão formal do PPG-DCEM, calcula-se anualmente com agregação MMA.',
  })

  // --- DPIDE1: DPI apenas com coautoria discente/egresso ---
  const dpide1Anos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dpide1Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes (DP - JDP = 0)',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const pubsAno = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      return mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true
    })
    const pubsAnoComQualis = pubsAno.filter((p) => Boolean((p.estrato_qualis || '').trim()))

    if (pubsAno.length === 0 || pubsAnoComQualis.length === 0) {
      dpide1Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando coautorias com discentes/egressos e Qualis em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { a1, a2, a3, a4, b1Bruto, b1Saturado, b2, b3, b4, c, pontosNumerador } =
        calcularPontuacaoQualisComSaturacao(pubsAno, true)
      const val = Number((pontosNumerador / denominadorEfetivo).toFixed(3))

      dpide1Anos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'A1 c/ discente', descricao: `Artigos A1 em ${ano}`, valor: a1 },
          { termo: 'A2 c/ discente', descricao: `Artigos A2 em ${ano}`, valor: a2 },
          { termo: 'A3 c/ discente', descricao: `Artigos A3 em ${ano}`, valor: a3 },
          { termo: 'A4 c/ discente', descricao: `Artigos A4 em ${ano}`, valor: a4 },
          { termo: 'min(B1, DP)', descricao: `B1 saturado (${b1Bruto} brutos)`, valor: b1Saturado },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dpide1Indicador = agregarComMMA(dpide1Anos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dpide1',
    codigo: 'DPIDE1',
    nome: 'DPI com Coautoria de Discentes e Egressos (Nível 1)',
    quesito: '2',
    itemFicha: '2.2.1',
    pesoPercentual: 10,
    pesoQuesitoGeral: '25%',
    formulaTexto:
      'DPIDE1 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define DPIDE1 originalmente como total do quadriênio. Por decisão formal do programa PPG-DCEM, adota-se o cálculo anual com MMA.',
  })

  // --- DPIDE2: DPI de publicações Nível 2 com discentes ---
  const dpide2Anos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dpide2Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const pubsAnoN2 = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      const isNivel2 = p.indicacao_nivel === 2
      const temCoautoria = mapaCoautoriaPub.get(p.id)?.temDiscenteOuEgresso === true
      return isNivel2 && temCoautoria
    })
    const pubsAnoN2ComQualis = pubsAnoN2.filter((p) => Boolean((p.estrato_qualis || '').trim()))

    if (pubsAnoN2.length === 0 || pubsAnoN2ComQualis.length === 0) {
      dpide2Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando indicação Nível 2 com coautoria e Qualis em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { a1, a2, a3, a4, b1Bruto, b1Saturado, b2, b3, b4, c, pontosNumerador } =
        calcularPontuacaoQualisComSaturacao(pubsAnoN2, true)
      const val = Number((pontosNumerador / denominadorEfetivo).toFixed(3))

      dpide2Anos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'A1 N2', descricao: `Artigos A1 Nível 2 em ${ano}`, valor: a1 },
          { termo: 'A2 N2', descricao: `Artigos A2 Nível 2 em ${ano}`, valor: a2 },
          { termo: 'A3 N2', descricao: `Artigos A3 Nível 2 em ${ano}`, valor: a3 },
          { termo: 'A4 N2', descricao: `Artigos A4 Nível 2 em ${ano}`, valor: a4 },
          {
            termo: 'min(B1, DP)',
            descricao: `B1 N2 saturado (${b1Bruto} brutos)`,
            valor: b1Saturado,
          },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dpide2Indicador = agregarComMMA(dpide2Anos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dpide2',
    codigo: 'DPIDE2',
    nome: 'DPI de Publicações Melhores com Discentes (Nível 2)',
    quesito: '2',
    itemFicha: '2.2.2',
    pesoPercentual: 12,
    pesoQuesitoGeral: '25%',
    formulaTexto:
      'DPIDE2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define DPIDE2 originalmente como total do quadriênio. Por decisão formal do PPG-DCEM, adota-se o cálculo anual com MMA.',
  })

  // --- DPI2: todas as publicações Nível 2 dos DPs ---
  const dpi2Anos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dpi2Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const pubsAnoN2 = pubsNoQuadrienio.filter((p) => {
      if (anoPublicacao(p) !== ano) return false
      return p.indicacao_nivel === 2
    })
    const pubsAnoN2ComQualis = pubsAnoN2.filter((p) => Boolean((p.estrato_qualis || '').trim()))

    if (pubsAnoN2.length === 0 || pubsAnoN2ComQualis.length === 0) {
      dpi2Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando indicação de publicações Nível 2 com Qualis em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { a1, a2, a3, a4, b1Bruto, b1Saturado, b2, b3, b4, c, pontosNumerador } =
        calcularPontuacaoQualisComSaturacao(pubsAnoN2, true)
      const val = Number((pontosNumerador / denominadorEfetivo).toFixed(3))

      dpi2Anos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'A1 N2', descricao: `Artigos A1 Nível 2 em ${ano}`, valor: a1 },
          { termo: 'A2 N2', descricao: `Artigos A2 Nível 2 em ${ano}`, valor: a2 },
          { termo: 'A3 N2', descricao: `Artigos A3 Nível 2 em ${ano}`, valor: a3 },
          { termo: 'A4 N2', descricao: `Artigos A4 Nível 2 em ${ano}`, valor: a4 },
          {
            termo: 'min(B1, DP)',
            descricao: `B1 N2 saturado (${b1Bruto} brutos)`,
            valor: b1Saturado,
          },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dpi2Indicador = agregarComMMA(dpi2Anos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dpi2',
    codigo: 'DPI2',
    nome: 'DPI das Melhores Publicações do Programa (Nível 2)',
    quesito: '2',
    itemFicha: '2.4.3',
    pesoPercentual: 6,
    pesoQuesitoGeral: '25%',
    formulaTexto:
      'DPI2 = [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: denominadorEfetivo,
        descricao: `Denominador DP − JDP: ${denominadorEfetivo}`,
        atendido: denominadorEfetivo > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define DPI2 originalmente como total do quadriênio. Por decisão formal do PPG-DCEM, adota-se o cálculo anual com MMA.',
  })

  // =========================================================================
  // QUESITO 3.1: PATENTES (DPPn e DPPi) — com MMA por decisão do programa
  // =========================================================================
  const patentesNacionais = dados.patentes.filter((p) => {
    const amb = normStr((p as any).ambito)
    if (amb === 'nacional') return true
    if (amb === 'internacional') return false
    const inpi = (p.inpi || '').toUpperCase().trim()
    return inpi.startsWith('BR') || inpi.length > 0
  })

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

  // --- DPPn: Patentes Nacionais ---
  const dppnAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dppnAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const patsAno = patentesNacionais.filter((p) => {
      const a = anoPatente(p)
      // Se não tem ano inferível na patente, só associa ao primeiro ano caso seja anoReferencia
      return a === ano
    })

    if (patsAno.length === 0) {
      dppnAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de patentes nacionais em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { licenciadas, concedidas, depositadas, pontos } = calcularPontuacaoPatentes(patsAno)
      const val = Number((pontos / denominadorEfetivo).toFixed(3))
      dppnAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'Depositadas (peso 0.3)',
            descricao: `Depositadas em ${ano}`,
            valor: depositadas,
          },
          { termo: 'Concedidas (peso 0.6)', descricao: `Concedidas em ${ano}`, valor: concedidas },
          {
            termo: 'Licenciadas (peso 1.0)',
            descricao: `Licenciadas em ${ano}`,
            valor: licenciadas,
          },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontos },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dppnIndicador = agregarComMMA(dppnAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dppn',
    codigo: 'DPPn',
    nome: 'Índice de Patentes Nacionais (DPPn)',
    quesito: '3.1',
    itemFicha: '3.1.1',
    pesoPercentual: 8,
    pesoQuesitoGeral: '30%',
    formulaTexto:
      'DPPn = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: patentesNacionais.length,
        descricao: `${patentesNacionais.length} patentes nacionais cadastradas`,
        atendido: patentesNacionais.length > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define o índice de patentes para o quadriênio como um todo. Por decisão formal do PPG-DCEM, aplica-se o cálculo anual e a agregação via MMA.',
  })

  // --- DPPi: Patentes Internacionais ---
  const dppiAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorEfetivo === 0) {
      dppiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes regulares',
        valorCalculado: null,
        decomposicao: [],
      }
      continue
    }

    const patsAno = patentesInternacionais.filter((p) => {
      const a = anoPatente(p)
      return a === ano
    })

    if (patsAno.length === 0) {
      dppiAnos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando insumo de patentes internacionais em ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      const { licenciadas, concedidas, depositadas, pontos } = calcularPontuacaoPatentes(patsAno)
      const val = Number((pontos / denominadorEfetivo).toFixed(3))
      dppiAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          {
            termo: 'Depositadas (peso 0.3)',
            descricao: `Depositadas internacionais em ${ano}`,
            valor: depositadas,
          },
          {
            termo: 'Concedidas (peso 0.6)',
            descricao: `Concedidas internacionais em ${ano}`,
            valor: concedidas,
          },
          {
            termo: 'Licenciadas (peso 1.0)',
            descricao: `Licenciadas internacionais em ${ano}`,
            valor: licenciadas,
          },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontos },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
        ],
      }
    }
  }

  const dppiIndicador = agregarComMMA(dppiAnos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dppi',
    codigo: 'DPPi',
    nome: 'Índice de Patentes Internacionais (DPPi)',
    quesito: '3.1',
    itemFicha: '3.1.1',
    pesoPercentual: 10,
    pesoQuesitoGeral: '30%',
    formulaTexto:
      'DPPi = [N(licenciadas) + 0,6·N(concedidas) + 0,3·N(depositadas)] / (DP − JDP) [MMA]',
    unidade: '',
    decomposicao: [
      { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorEfetivo },
    ],
    insumos: [
      {
        totalExistente: patentesInternacionais.length,
        descricao: `${patentesInternacionais.length} patentes internacionais cadastradas`,
        atendido: patentesInternacionais.length > 0,
      },
    ],
    observacoes:
      'A ficha CAPES define o índice de patentes para o quadriênio como um todo. Por decisão formal do PPG-DCEM, adota-se cálculo anual com agregação MMA.',
  })

  // =========================================================================
  // BLOCO BIBLIOMÉTRICO (ESTOQUE): ÍNDICE-H DO CORPO DOCENTE (Scopus)
  // Regra 3: Indicadores de estoque (ADE, H2, H médio, H mediano, JDP) SEM anualização.
  // =========================================================================
  const dpIndicesH: number[] = permanentes
    .map((d) => (typeof d.indice_h === 'number' && !isNaN(d.indice_h) ? d.indice_h : 0))
    .sort((a, b) => b - a) // ordem decrescente

  const totalDpComHPositivo = dpIndicesH.filter((h) => h > 0).length

  // H2 do programa: maior valor inteiro H2 tal que existam >= H2 permanentes com indice_h >= H2
  let h2Programa = 0
  for (let i = 0; i < dpIndicesH.length; i++) {
    const rank = i + 1
    if (dpIndicesH[i] >= rank) {
      h2Programa = rank
    } else {
      break
    }
  }

  const hMedio =
    dpIndicesH.length > 0
      ? Number((dpIndicesH.reduce((acc, v) => acc + v, 0) / dpIndicesH.length).toFixed(2))
      : 0

  const hMediano = (() => {
    if (dpIndicesH.length === 0) return 0
    const meio = Math.floor(dpIndicesH.length / 2)
    if (dpIndicesH.length % 2 === 1) {
      return dpIndicesH[meio]
    }
    return Number(((dpIndicesH[meio - 1] + dpIndicesH[meio]) / 2).toFixed(1))
  })()

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
        metodologia: 'estoque',
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
        metodologia: 'estoque',
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
      metodologia: 'estoque',
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
        'Indicador de estoque (sem anualização): valor medido no período conforme base Scopus oficial da área Engenharias II (CAPES).',
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
