import { ANO_INICIO, ANO_FIM } from '../reconducao/types'
import {
  extrairAnoDeData,
  extrairTermosDocente,
  textoContemDocente,
  isMestradoConcluido,
  isDoutoradoConcluido,
  orientacaoNoPeriodo,
  obterAnoOrientacaoDefesa,
} from '../reconducao/calculo'
import { calcularStatusEfetivoOrientacao } from '../orientacoes/status'
import { calcularResumoJdpPrograma } from './jdp'
import { idsDocentesDaDisciplina } from '../disciplinas/docentes'
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
 * Ano da patente: `ano_deposito` quando informado; para registros legados, cai no ano de
 * cadastro (`created_at`), que é só aproximação e deve ser substituído preenchendo o campo.
 */
function anoPatente(pat: Patente): number | null {
  const ano = Number(pat.ano_deposito)
  if (Number.isInteger(ano) && ano >= 1900 && ano <= 2100) return ano
  if (pat.created_at) {
    const a = extrairAnoDeData(pat.created_at)
    if (a) return a
  }
  return null
}

const normalizarNomeTermos = extrairTermosDocente
const textoContemNome = textoContemDocente

/**
 * Classifica a patente em um único âmbito: `ambito` explícito; senão pelo prefixo do registro
 * (BR = nacional; PCT/US/EP/WO = internacional; outro registro preenchido = nacional).
 * Sem âmbito e sem registro, não é classificada.
 */
function classificarAmbitoPatente(p: Patente): 'nacional' | 'internacional' | null {
  const amb = normStr(p.ambito)
  if (amb === 'nacional' || amb === 'internacional') return amb
  const inpi = (p.inpi || '').toUpperCase().trim()
  if (!inpi) return null
  if (/^(PCT|US|EP|WO)/.test(inpi)) return 'internacional'
  return 'nacional'
}

/**
 * Projeto vigente no ano: início <= ano e (sem fim ou fim >= ano).
 * Sem nenhuma data não há evidência para excluir, então é considerado vigente.
 */
function projetoVigenteNoAno(
  p: { inicio?: string | null; fim?: string | null },
  ano: number,
): boolean {
  const ini = extrairAnoDeData(p.inicio)
  const fim = extrairAnoDeData(p.fim)
  if (ini !== null && ano < ini) return false
  if (fim !== null && ano > fim) return false
  return true
}

/**
 * Anos posteriores ao ano de referência ainda não aconteceram: orientações em andamento, projetos
 * sem fim e afins seriam apenas projetados para eles, e o resultado entraria na média como se fosse
 * um ano medido (por exemplo, 0% de DP4A em 2028). Esses anos ficam 'indefinido' e fora da MMA.
 */
function descartarAnosFuturos(
  anosResultados: Record<number, ResultadoAnoIndicador>,
  anoReferencia: number,
): Record<number, ResultadoAnoIndicador> {
  const resultado: Record<number, ResultadoAnoIndicador> = {}
  for (const [chave, r] of Object.entries(anosResultados)) {
    const ano = Number(chave)
    resultado[ano] =
      ano > anoReferencia
        ? {
            ano,
            status: 'indefinido',
            motivoIndefinido: `ano ${ano} ainda não iniciado (ano de referência ${anoReferencia})`,
            valorCalculado: null,
            decomposicao: [],
          }
        : r
  }
  return resultado
}

/**
 * Agrega resultados anuais calculando a MMA (Média das Médias Anuais).
 * Regras prescritivas:
 * - Anos sem insumo ficam 'indefinido' e NÃO entram como 0 na média.
 * - A MMA calcula a média aritmética dos anos válidos (com insumo calculado).
 * - Se nenhum ano tiver insumo, MMA é nula e o indicador fica indefinido.
 * - completo: true somente se todos os 4 anos (2025..2028) estiverem calculados.
 */
function agregarAnosComMMA(
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

  // Todos os indicadores anuais passam por aqui: anos futuros não entram na MMA.
  const agregarComMMA: typeof agregarAnosComMMA = (anosResultados, anos, metodologia, base) =>
    agregarAnosComMMA(descartarAnosFuturos(anosResultados, anoReferencia), anos, metodologia, base)

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

  // O JDP é avaliado ano a ano: quem completa 4 anos como JDP (ou 10 de doutorado) deixa de ser JDP
  // naquele ano e volta ao denominador. O resumo do ano de referência segue em resumoJdp/JDP_validos.
  const jdpPorAno = new Map<number, ReturnType<typeof calcularResumoJdpPrograma>>()
  const jdpDoAno = (ano: number) => {
    let resumo = jdpPorAno.get(ano)
    if (!resumo) {
      resumo = calcularResumoJdpPrograma(docentes, ano)
      jdpPorAno.set(ano, resumo)
    }
    return resumo
  }
  const denominadorDoAno = (ano: number) => Math.max(0, DP - jdpDoAno(ano).totalJdpValidos)
  const regularesDoAno = (ano: number) => {
    const idsJdp = new Set(jdpDoAno(ano).jdpValidos.map((j) => j.id))
    return permanentes.filter((d) => !idsJdp.has(d.id))
  }

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
    {
      temDiscenteOuEgresso: boolean
      tipos: string[]
      discenteIds: number[]
      egressoIds: number[]
      coautores: Array<{ tipo: string; egressoId: number | null }>
    }
  >()
  for (const c of coautoresList) {
    const entry = mapaCoautoriaPub.get(c.publicacao_id) || {
      temDiscenteOuEgresso: false,
      tipos: [],
      discenteIds: [],
      egressoIds: [],
      coautores: [],
    }
    const t = normStr(c.tipo)
    if (t === 'orientando' || t === 'egresso' || t === 'discente') {
      entry.temDiscenteOuEgresso = true
      entry.tipos.push(c.tipo)
      if (c.discente_id) entry.discenteIds.push(c.discente_id)
      if (c.egresso_id) entry.egressoIds.push(c.egresso_id)
      entry.coautores.push({ tipo: t, egressoId: c.egresso_id ?? null })
    }
    mapaCoautoriaPub.set(c.publicacao_id, entry)
  }

  // Janela dos egressos (itens 2.1.2 e 2.2.1): "titulado até 5 anos". Conta-se pelo ano da
  // publicação: vale se ano_publicacao <= ano_titulacao + 5. Discente em formação sempre vale.
  const JANELA_EGRESSO_ANOS = 5
  const anoTitulacaoPorEgresso = new Map<number, number | null>()
  for (const e of dados.egressos || []) {
    anoTitulacaoPorEgresso.set(e.id, e.ano_titulacao ?? null)
  }
  const pubTemCoautoriaValida = (pub: Publicacao): boolean => {
    const info = mapaCoautoriaPub.get(pub.id)
    if (!info) return false
    const anoPub = anoPublicacao(pub)
    return info.coautores.some((c) => {
      if (c.tipo !== 'egresso') return true
      const anoTit = c.egressoId !== null ? (anoTitulacaoPorEgresso.get(c.egressoId) ?? null) : null
      // Sem ano de titulação não há como aplicar a janela: o dado real não é descartado
      if (anoTit === null || anoPub === null) return true
      return anoPub <= anoTit + JANELA_EGRESSO_ANOS
    })
  }
  const egressosCoautoresSemAno = new Set<string>()
  for (const c of coautoresList) {
    if (normStr(c.tipo) !== 'egresso') continue
    const anoTit = c.egresso_id != null ? (anoTitulacaoPorEgresso.get(c.egresso_id) ?? null) : null
    if (anoTit === null) {
      egressosCoautoresSemAno.add(c.egresso_id != null ? `id:${c.egresso_id}` : `nome:${c.nome_citado ?? c.publicacao_id}`)
    }
  }

  // Item 2.4.1 (obs.): a produção de DP sem coautoria de discente ou egresso conta dividida pelo
  // número de programas em que o docente é permanente. A publicação continua contando uma vez:
  // com vários DP autores, vale o mais exclusivo (menor número de programas).
  const programasPorDocente = new Map<number, number>()
  for (const d of docentes) {
    const n = Math.floor(Number(d.programas_permanente))
    programasPorDocente.set(d.id, Number.isFinite(n) && n >= 1 ? n : 1)
  }
  const fatorProgramasDaPublicacao = (pub: Publicacao): number => {
    if (pubTemCoautoriaValida(pub)) return 1
    const { docIds } = pubPertenceADocentePermanente(pub)
    if (docIds.length === 0) return 1
    return 1 / Math.min(...docIds.map((id) => programasPorDocente.get(id) ?? 1))
  }

  // Publicações no quadriênio
  const pubsNoQuadrienio = dados.publicacoes.filter((p) => {
    const a = anoPublicacao(p)
    return anoDentro(a, anoInicio, anoFim)
  })

  // Orientações concluídas no quadriênio com orientador permanente (usa status efetivo derivado)
  const oriConcluidasNoQuadrienio = dados.orientacoes.filter((o) => {
    const noPeriodo = orientacaoNoPeriodo(o, anoInicio, anoFim)
    const statusEfetivo =
      o.status_efetivo ||
      calcularStatusEfetivoOrientacao({
        status: o.status,
        fim: o.fim,
        cancelado: o.cancelado,
      })
    const concluida =
      statusEfetivo === 'concluido' ||
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
    fatorDaPublicacao?: (pub: Publicacao) => number,
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
      // Cada publicação conta uma única vez, independentemente de quantos DPs a assinam.
      // O fator só reduz o peso por programas do DP (item 2.4.1), nunca multiplica por autores.
      const fatorMultiplicador = fatorDaPublicacao ? fatorDaPublicacao(p) : 1

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
      }
      // Status desconhecido (ex.: arquivada) não pontua.
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

    // Orientações ativas no ano (seja por status efetivo 'em_andamento'/ativo ou vigência temporal)
    const ativasAno = dados.orientacoes.filter((ori) => {
      const statusEfetivo =
        ori.status_efetivo ||
        calcularStatusEfetivoOrientacao({
          status: ori.status,
          fim: ori.fim,
          cancelado: ori.cancelado,
        })
      // Só conta quem está em andamento: sem data de fim ou com fim futuro. O rótulo gravado
      // ('ativo' ou 'em_andamento') não importa; fim já passado é orientação concluída.
      if (statusEfetivo !== 'em_andamento') return false
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
    if (regularesDoAno(ano).length === 0) {
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
      const statusEfetivo =
        ori.status_efetivo ||
        calcularStatusEfetivoOrientacao({
          status: ori.status,
          fim: ori.fim,
          cancelado: ori.cancelado,
        })
      const concluida =
        statusEfetivo === 'concluido' ||
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
      const docsSemDefesa = regularesDoAno(ano).filter((d) => !docsComDefesa.has(d.id)).length
      const val = Number(((docsSemDefesa / regularesDoAno(ano).length) * 100).toFixed(2))

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
          { termo: 'DP regulares', descricao: 'Permanentes excluindo JDP', valor: regularesDoAno(ano).length },
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
      const stEfetivo =
        o.status_efetivo ||
        calcularStatusEfetivoOrientacao({
          status: o.status,
          fim: o.fim,
          cancelado: o.cancelado,
        })
      const isAtiva = stEfetivo === 'em_andamento'
      if (isAtiva && o.docente_id) {
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
      if (niv === 'pos_graduacao' || niv === '') {
        if (discNoAno(d, ano)) {
          for (const docId of idsDocentesDaDisciplina(d)) docsPg.add(docId)
        }
      }
    }

    // 3. Projetos de pesquisa vigentes no ano (coordenador ou participante)
    const docsProj = new Set<number>()
    const projetosVigentesIds = new Set<number>()
    for (const p of dados.projetos) {
      if (!projetoVigenteNoAno(p, ano)) continue
      projetosVigentesIds.add(p.id)
      if (p.coordenador_id) docsProj.add(p.coordenador_id)
    }
    for (const part of dados.projetosParticipantes) {
      if (part.docente_id && projetosVigentesIds.has(part.projeto_id)) {
        docsProj.add(part.docente_id)
      }
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
      const idsDocentes = idsDocentesDaDisciplina(d)
      const vinculado = idsDocentes.length ? idsDocentes.some((id) => idsPermanentesSet.has(id)) : true
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
        for (const docId of idsDocentesDaDisciplina(d)) {
          if (idsPermanentesSet.has(docId)) docsComGrad.add(docId)
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
    if (denominadorDoAno(ano) === 0) {
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
      const val = Number(((mAno + 3 * dAno) / denominadorDoAno(ano)).toFixed(3))
      oriAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'M', descricao: `Mestrados em ${ano}`, valor: mAno },
          { termo: 'D', descricao: `Doutorados em ${ano}`, valor: dAno },
          { termo: 'M + 3D', descricao: 'Numerador ponderado', valor: mAno + 3 * dAno },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
      const temCoautoria = pubTemCoautoriaValida(p)
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
    if (denominadorDoAno(ano) === 0) {
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
        calcularPontuacaoQualisComSaturacao(pubsAno, fatorProgramasDaPublicacao)
      const val = Number((pontosNumerador / denominadorDoAno(ano)).toFixed(3))

      dpiAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'A1 (peso 1.0)', descricao: 'Artigos A1', valor: a1 },
          { termo: 'A2 (peso 0.875)', descricao: 'Artigos A2', valor: a2 },
          { termo: 'A3 (peso 0.75)', descricao: 'Artigos A3', valor: a3 },
          { termo: 'A4 (peso 0.675)', descricao: 'Artigos A4', valor: a4 },
          {
            termo: 'min(B1, DP) (peso 0.5)',
            descricao: `B1 saturado (${b1Bruto} brutos, teto ${DP})`,
            valor: b1Saturado,
          },
          { termo: 'B2..C', descricao: 'Artigos sem pontuação', valor: b2 + b3 + b4 + c },
          { termo: 'Numerador', descricao: 'Pontos ponderados', valor: pontosNumerador },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
    if (denominadorDoAno(ano) === 0) {
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
        const docsVinculadosQtd = fatorProgramasDaPublicacao(p)
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
      const val = Number((totalItens / denominadorDoAno(ano)).toFixed(3))

      dptAnos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'Periódicos', descricao: `Periódicos em ${ano}`, valor: periodicos },
          { termo: 'Anais', descricao: `Anais em ${ano}`, valor: anais },
          { termo: 'Capítulos', descricao: `Capítulos em ${ano}`, valor: capitulos },
          { termo: 'Total', descricao: 'Soma (cada publicação conta uma vez)', valor: totalItens },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
    if (denominadorDoAno(ano) === 0) {
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
      return pubTemCoautoriaValida(p)
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
        calcularPontuacaoQualisComSaturacao(pubsAno)
      const val = Number((pontosNumerador / denominadorDoAno(ano)).toFixed(3))

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
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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

  // --- DPTDE1: DPT apenas com coautoria discente/egresso (item 2.2.1) ---
  const dptde1Anos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorDoAno(ano) === 0) {
      dptde1Anos[ano] = {
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
      return pubTemCoautoriaValida(p)
    })

    if (pubsAno.length === 0) {
      dptde1Anos[ano] = {
        ano,
        status: 'indefinido',
        motivoIndefinido: `aguardando coautorias com discentes/egressos no ano ${ano}`,
        valorCalculado: null,
        decomposicao: [],
      }
    } else {
      let periodicos = 0
      let anais = 0
      let capitulos = 0
      for (const p of pubsAno) {
        const docsVinculadosQtd = 1
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
      const val = Number((totalItens / denominadorDoAno(ano)).toFixed(3))

      dptde1Anos[ano] = {
        ano,
        status: 'calculado',
        valorCalculado: val,
        decomposicao: [
          { termo: 'Periódicos', descricao: `Periódicos em ${ano}`, valor: periodicos },
          { termo: 'Anais', descricao: `Anais em ${ano}`, valor: anais },
          { termo: 'Capítulos', descricao: `Capítulos em ${ano}`, valor: capitulos },
          { termo: 'Total', descricao: 'Soma (cada publicação conta uma vez)', valor: totalItens },
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
        ],
      }
    }
  }

  const dptde1Indicador = agregarComMMA(dptde1Anos, anosQuadrienio, 'quadrienio_mma', {
    id: 'dptde1',
    codigo: 'DPTDE1',
    nome: 'DPT com Coautoria de Discentes e Egressos (Nível 1)',
    quesito: '2',
    itemFicha: '2.2.1',
    pesoPercentual: 0,
    pesoQuesitoGeral: '25%',
    formulaTexto:
      'DPTDE1 = (artigos completos (periódicos + anais) + capítulos c/ discentes e egressos) / (DP − JDP) [MMA]',
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
      'Item 2.2.1 (10%): a ficha não divide o peso entre DPIDE1 e DPTDE1, então o peso fica concentrado no DPIDE1. Cálculo anual com agregação MMA por decisão formal do PPG-DCEM.',
  })

  // --- DPIDE2: DPI de publicações Nível 2 com discentes ---
  const dpide2Anos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorDoAno(ano) === 0) {
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
      const temCoautoria = pubTemCoautoriaValida(p)
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
        calcularPontuacaoQualisComSaturacao(pubsAnoN2)
      const val = Number((pontosNumerador / denominadorDoAno(ano)).toFixed(3))

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
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
    if (denominadorDoAno(ano) === 0) {
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
        calcularPontuacaoQualisComSaturacao(pubsAnoN2, fatorProgramasDaPublicacao)
      const val = Number((pontosNumerador / denominadorDoAno(ano)).toFixed(3))

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
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
  const patentesNacionais = dados.patentes.filter((p) => classificarAmbitoPatente(p) === 'nacional')
  const patentesInternacionais = dados.patentes.filter(
    (p) => classificarAmbitoPatente(p) === 'internacional',
  )

  // --- DPPn: Patentes Nacionais ---
  const dppnAnos: Record<number, ResultadoAnoIndicador> = {}
  for (const ano of anosQuadrienio) {
    if (denominadorDoAno(ano) === 0) {
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
      const val = Number((pontos / denominadorDoAno(ano)).toFixed(3))
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
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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
    if (denominadorDoAno(ano) === 0) {
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
      const val = Number((pontos / denominadorDoAno(ano)).toFixed(3))
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
          { termo: 'DP − JDP', descricao: 'Denominador efetivo', valor: denominadorDoAno(ano) },
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

  // =========================================================================
  // QUESITO 3.3 (apoio ao item 3.3.2): FOR = % de DP com bolsa PQ + DT do CNPq
  // Níveis: 1 (SR, 1A–1D) e 2 (PQ-2, DT-2). Indicador de estoque.
  // =========================================================================
  const forIndicador: ResultadoIndicador = (() => {
    const base = {
      id: 'for',
      codigo: 'FOR',
      nome: 'Docentes Permanentes com Bolsa PQ/DT CNPq (FOR)',
      quesito: '3.3' as const,
      itemFicha: '3.3.2',
      pesoPercentual: 25,
      pesoQuesitoGeral: '40%',
      formulaTexto: 'FOR = (DP com bolsa PQ ou DT do CNPq) / DP',
      unidade: '%',
      metodologia: 'estoque' as const,
    }
    const insumos: InsumoStatus[] = [
      {
        totalExistente: DP,
        descricao: `${DP} docentes permanentes (DP)`,
        atendido: DP > 0,
      },
    ]

    if (DP === 0) {
      return {
        ...base,
        status: 'indefinido',
        motivoIndefinido: 'aguardando insumo de docentes permanentes',
        valorCalculado: null,
        decomposicao: [],
        insumos,
      }
    }

    let nivel1 = 0
    let nivel2 = 0
    let dt = 0
    for (const d of permanentes) {
      const bolsa = normStr(d.bolsa_cnpq).replace(/[\s_]+/g, '-')
      const ehPq = bolsa.startsWith('pq')
      const ehDt = bolsa.startsWith('dt')
      if (!ehPq && !ehDt) continue
      if (ehDt) dt++
      if (bolsa.endsWith('-2')) nivel2++
      else nivel1++
    }
    const comBolsa = nivel1 + nivel2
    const valor = Number(((comBolsa / DP) * 100).toFixed(2))

    return {
      ...base,
      status: 'calculado',
      valorCalculado: valor,
      decomposicao: [
        { termo: 'DP com PQ/DT', descricao: 'Permanentes com bolsa PQ ou DT', valor: comBolsa },
        { termo: 'Nível 1', descricao: 'PQ-SR, PQ 1A–1D e DT 1A–1B', valor: nivel1 },
        { termo: 'Nível 2', descricao: 'PQ 2 e DT 2', valor: nivel2 },
        { termo: 'dos quais DT', descricao: 'Bolsas de desenvolvimento tecnológico', valor: dt },
        { termo: 'DP', descricao: 'Docentes Permanentes', valor: DP },
      ],
      insumos,
      observacoes:
        'O item 3.3.2 é avaliado de forma qualitativa/comparativa; o FOR é um dos descritores citados na ficha e não define a nota sozinho.',
    }
  })()

  // DPI, DPT e DPI2: explicam a divisão por programas quando algum DP é permanente em outro programa
  const dpComOutrosProgramas = permanentes.filter((d) => (programasPorDocente.get(d.id) ?? 1) > 1)
  if (dpComOutrosProgramas.length > 0) {
    const textoProgramas = `Produção sem coautoria de discente ou egresso dividida pelo nº de programas do DP (item 2.4.1): ${dpComOutrosProgramas.length} DP em mais de um programa. Com vários DP autores, vale o mais exclusivo.`
    for (const ind of [dpiIndicador, dptIndicador, dpi2Indicador]) {
      ind.observacoes = ind.observacoes ? `${ind.observacoes} ${textoProgramas}` : textoProgramas
    }
  }

  // Indicadores com coautoria de discente/egresso: explicam a janela e avisam sobre dados faltantes
  const textoJanela =
    'Coautoria de egresso só vale até 5 anos após a titulação (ano da publicação ≤ ano de titulação + 5); discentes em formação sempre valem.'
  for (const ind of [atdIndicador, dpide1Indicador, dptde1Indicador, dpide2Indicador]) {
    ind.observacoes = ind.observacoes ? `${ind.observacoes} ${textoJanela}` : textoJanela
    if (egressosCoautoresSemAno.size > 0) {
      ind.insumos.push({
        totalExistente: egressosCoautoresSemAno.size,
        descricao: `${egressosCoautoresSemAno.size} egresso(s) coautor(es) sem ano de titulação: contados sem aplicar a janela de 5 anos`,
        atendido: false,
      })
    }
  }

  // Agrupamento em Quesitos
  const todosIndicadores: ResultadoIndicador[] = [
    adeIndicador,
    oriIndicador,
    atdIndicador,
    dpiIndicador,
    dptIndicador,
    dpide1Indicador,
    dptde1Indicador,
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
    forIndicador,
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
      dptde1Indicador,
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

  const quesito33: ResumoQuesito = {
    quesito: '3.3',
    titulo: 'Quesito 3.3 — Internacionalização e Inserção (descritores do item 3.3.2)',
    pesoTotalPercentual: 40,
    indicadores: [forIndicador],
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
    quesitos: [quesito1, quesito2, quesito31, quesito33],
    todosIndicadores,
  }
}
