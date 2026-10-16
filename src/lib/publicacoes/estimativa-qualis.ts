import { EstratoQualis, Publicacao, TipoProducao } from '@/types/database'

export type GrauConfiancaSugestao = 'alta' | 'media' | 'baixa'

export interface MetricasFonteOpenAlex {
  sourceId?: string
  displayName?: string
  issn?: string[]
  citedness2yr?: number | null // summary_stats.2yr_mean_citedness
  hIndex?: number | null // summary_stats.h_index
  worksCount?: number | null
}

export interface MetricasWorkOpenAlex {
  workId?: string
  percentileMin?: number | null // cited_by_percentile_year.min
  percentileMax?: number | null // cited_by_percentile_year.max
  percentileValue?: number | null // média dos percentis ou valor único
  citationNormalizedPercentile?: number | null // citation_normalized_percentile.value (0..1)
  fwci?: number | null
  citedByCount?: number | null
  sourceName?: string | null
  issn?: string[] | null
}

export interface MetricasScopusSerial {
  sourceId?: string
  title?: string
  issn?: string | null
  sjr?: number | null
  snip?: number | null
  citeScore?: number | null
  percentileCiteScore?: number | null // percentil de citação da área Scopus (0..100)
}

export interface MetricasColetadas {
  openalexSource?: MetricasFonteOpenAlex | null
  openalexWork?: MetricasWorkOpenAlex | null
  scopusSerial?: MetricasScopusSerial | null
}

export interface SugestaoEstratoQualis {
  publicacaoId: number
  titulo: string
  periodico: string
  ano: number
  doi: string
  tipoProducao?: TipoProducao | null
  estratoAtual?: EstratoQualis | null

  // Resultado da estimativa
  estratoSugerido: EstratoQualis | null
  grauConfianca: GrauConfiancaSugestao
  justificativa: string
  metricasResumo: string
  metricasDetalhadas: MetricasColetadas

  // Status de elegibilidade
  elegivel: boolean
  motivoIneligibilidade?: string
}

/**
 * Converte percentil (0–100) em estrato Qualis (A1–B1)
 * Regra típica CAPES (Interdisciplinar / Engenharias / Ciências de Materiais):
 * - percentil >= 90: A1
 * - percentil 75 a 89.99: A2
 * - percentil 60 a 74.99: A3
 * - percentil 40 a 59.99: A4
 * - abaixo de 40: B1
 */
export function mapearPercentilParaQualis(percentil: number): {
  estrato: EstratoQualis
  faixa: string
} {
  const p = Math.max(0, Math.min(100, percentil))
  if (p >= 90) return { estrato: 'A1', faixa: 'percentil ≥ 90 (Top 10%)' }
  if (p >= 75) return { estrato: 'A2', faixa: 'percentil 75–89' }
  if (p >= 60) return { estrato: 'A3', faixa: 'percentil 60–74' }
  if (p >= 40) return { estrato: 'A4', faixa: 'percentil 40–59' }
  return { estrato: 'B1', faixa: 'percentil < 40' }
}

/**
 * Converte métrica de citação em 2 anos (2yr_mean_citedness do OpenAlex) em estrato estimado.
 * Calibração para Ciência e Engenharia de Materiais / Química:
 * - citedness >= 6.0: A1 (ex.: Ceramics International ~6.1, CEJ ~13.3)
 * - citedness >= 4.0: A2 (ex.: J. Alloys and Compounds ~5.5, Chemosphere ~8.1)
 * - citedness >= 2.5: A3 (ex.: Materials Letters ~3.0, Phys. Chem. Chem. Phys. ~3.6)
 * - citedness >= 1.2: A4 (ex.: Emergent Materials ~2.0, MRS Advances ~1.5)
 * - abaixo: B1
 */
export function mapearCitednessParaQualis(citedness: number): {
  estrato: EstratoQualis
  faixa: string
} {
  const c = Math.max(0, citedness)
  if (c >= 6.0) return { estrato: 'A1', faixa: 'citações 2 anos ≥ 6,0' }
  if (c >= 4.0) return { estrato: 'A2', faixa: 'citações 2 anos 4,0–5,9' }
  if (c >= 2.5) return { estrato: 'A3', faixa: 'citações 2 anos 2,5–3,9' }
  if (c >= 1.2) return { estrato: 'A4', faixa: 'citações 2 anos 1,2–2,4' }
  return { estrato: 'B1', faixa: 'citações 2 anos < 1,2' }
}

/**
 * Converte SJR do Scopus em estrato estimado
 * - SJR >= 1.5: A1
 * - SJR 1.0 a 1.49: A2
 * - SJR 0.6 a 0.99: A3
 * - SJR 0.3 a 0.59: A4
 * - SJR < 0.3: B1
 */
export function mapearSjrParaQualis(sjr: number): {
  estrato: EstratoQualis
  faixa: string
} {
  const s = Math.max(0, sjr)
  if (s >= 1.5) return { estrato: 'A1', faixa: 'SJR Scopus ≥ 1,5' }
  if (s >= 1.0) return { estrato: 'A2', faixa: 'SJR Scopus 1,0–1,49' }
  if (s >= 0.6) return { estrato: 'A3', faixa: 'SJR Scopus 0,6–0,99' }
  if (s >= 0.3) return { estrato: 'A4', faixa: 'SJR Scopus 0,3–0,59' }
  return { estrato: 'B1', faixa: 'SJR Scopus < 0,3' }
}

/**
 * Converte fator de impacto JCR (se preenchido na publicação) em estrato estimado
 * - JCR >= 5.0: A1
 * - JCR 3.5 a 4.99: A2
 * - JCR 2.0 a 3.49: A3
 * - JCR 1.0 a 1.99: A4
 * - JCR < 1.0: B1
 */
export function mapearJcrParaQualis(jcr: number): {
  estrato: EstratoQualis
  faixa: string
} {
  const j = Math.max(0, jcr)
  if (j >= 5.0) return { estrato: 'A1', faixa: 'fator de impacto JCR ≥ 5,0' }
  if (j >= 3.5) return { estrato: 'A2', faixa: 'fator de impacto JCR 3,5–4,99' }
  if (j >= 2.0) return { estrato: 'A3', faixa: 'fator de impacto JCR 2,0–3,49' }
  if (j >= 1.0) return { estrato: 'A4', faixa: 'fator de impacto JCR 1,0–1,99' }
  return { estrato: 'B1', faixa: 'fator de impacto JCR < 1,0' }
}

/**
 * Avalia elegibilidade da publicação para estimativa automática de Qualis
 */
export function verificarElegibilidadePublicacao(pub: Publicacao): {
  elegivel: boolean
  motivo?: string
} {
  // REGRA DE OURO 2: Se já tem estrato_qualis atribuído (manual ou anterior), NUNCA é reprocessado!
  if (pub.estrato_qualis && pub.estrato_qualis.trim() !== '') {
    return {
      elegivel: false,
      motivo: `Publicação já possui estrato (${pub.estrato_qualis}) atribuído. Preservação estrita: não reprocessar.`,
    }
  }

  // Se o tipo for explicitamente anais ou capítulo, não tem métrica de periódico
  const tp = (pub.tipo_producao || '').trim().toLowerCase()
  if (tp === 'trabalho em anais') {
    return {
      elegivel: false,
      motivo: 'Trabalho em anais não possui métrica de periódico — confirmar manualmente.',
    }
  }
  if (tp === 'capítulo' || tp === 'capitulo') {
    return {
      elegivel: false,
      motivo: 'Capítulo de livro não possui métrica de periódico — confirmar manualmente.',
    }
  }

  // Periódico ausente
  const per = (pub.periodico || '').trim()
  if (!per) {
    return {
      elegivel: false,
      motivo: 'Periódico não informado — confirmar manualmente.',
    }
  }

  return { elegivel: true }
}

/**
 * Combina as métricas coletadas para gerar uma sugestão de estrato Qualis fundamentada
 */
export function estimarEstratoQualis(
  pub: Publicacao,
  metricas?: MetricasColetadas,
): SugestaoEstratoQualis {
  const elegibilidade = verificarElegibilidadePublicacao(pub)

  const base: SugestaoEstratoQualis = {
    publicacaoId: pub.id,
    titulo: pub.titulo,
    periodico: pub.periodico,
    ano: pub.ano,
    doi: pub.doi || '',
    tipoProducao: pub.tipo_producao,
    estratoAtual: pub.estrato_qualis,
    estratoSugerido: null,
    grauConfianca: 'baixa',
    justificativa: elegibilidade.motivo || 'Sem métricas encontradas — confirmar manualmente.',
    metricasResumo: 'Nenhuma métrica disponível',
    metricasDetalhadas: metricas || {},
    elegivel: elegibilidade.elegivel,
    motivoIneligibilidade: elegibilidade.motivo,
  }

  if (!elegibilidade.elegivel) {
    return base
  }

  const coletadas = metricas || {}
  const partesJustificativa: string[] = []
  const partesResumo: string[] = []

  // 1. Prioridade A: Percentil Scopus da área / periódico (se disponível)
  if (
    coletadas.scopusSerial?.percentileCiteScore !== undefined &&
    coletadas.scopusSerial?.percentileCiteScore !== null
  ) {
    const scPercentil = coletadas.scopusSerial.percentileCiteScore
    const mapped = mapearPercentilParaQualis(scPercentil)
    const sjrTxt = coletadas.scopusSerial.sjr
      ? ` (SJR ${coletadas.scopusSerial.sjr.toFixed(2)})`
      : ''
    partesJustificativa.push(
      `Periódico no percentil ${scPercentil.toFixed(0)} no Scopus${sjrTxt} [${mapped.faixa}] → sugerido ${mapped.estrato}`,
    )
    partesResumo.push(`Scopus P${scPercentil.toFixed(0)}${sjrTxt}`)
    return {
      ...base,
      estratoSugerido: mapped.estrato,
      grauConfianca: 'alta',
      justificativa: partesJustificativa.join('; '),
      metricasResumo: partesResumo.join(' | '),
    }
  }

  // 2. Prioridade B: SJR do Scopus
  if (
    coletadas.scopusSerial?.sjr !== undefined &&
    coletadas.scopusSerial?.sjr !== null &&
    coletadas.scopusSerial.sjr > 0
  ) {
    const sjr = coletadas.scopusSerial.sjr
    const mapped = mapearSjrParaQualis(sjr)
    partesJustificativa.push(
      `Periódico com SJR ${sjr.toFixed(2)} no Scopus [${mapped.faixa}] → sugerido ${mapped.estrato}`,
    )
    partesResumo.push(`Scopus SJR ${sjr.toFixed(2)}`)
    return {
      ...base,
      estratoSugerido: mapped.estrato,
      grauConfianca: 'alta',
      justificativa: partesJustificativa.join('; '),
      metricasResumo: partesResumo.join(' | '),
    }
  }

  // 3. Prioridade C: Percentil do artigo no OpenAlex (cited_by_percentile_year)
  const workPercentil = coletadas.openalexWork?.percentileValue
  if (workPercentil !== undefined && workPercentil !== null && workPercentil > 0) {
    const mapped = mapearPercentilParaQualis(workPercentil)
    partesJustificativa.push(
      `Artigo no percentil ${workPercentil.toFixed(0)} no OpenAlex [${mapped.faixa}] → sugerido ${mapped.estrato}`,
    )
    partesResumo.push(`OpenAlex Artigo P${workPercentil.toFixed(0)}`)
    return {
      ...base,
      estratoSugerido: mapped.estrato,
      grauConfianca: 'alta',
      justificativa: partesJustificativa.join('; '),
      metricasResumo: partesResumo.join(' | '),
    }
  }

  // 4. Prioridade D: Citações médias em 2 anos da fonte OpenAlex (2yr_mean_citedness)
  const citedness = coletadas.openalexSource?.citedness2yr
  if (citedness !== undefined && citedness !== null && citedness > 0) {
    const mapped = mapearCitednessParaQualis(citedness)
    const hIndex = coletadas.openalexSource?.hIndex
    const hTxt = hIndex ? ` (h-index ${hIndex})` : ''
    partesJustificativa.push(
      `Periódico com ${citedness.toFixed(2)} citações/2 anos no OpenAlex${hTxt} [${mapped.faixa}] → sugerido ${mapped.estrato}`,
    )
    partesResumo.push(`OpenAlex C2Y ${citedness.toFixed(2)}${hTxt}`)
    return {
      ...base,
      estratoSugerido: mapped.estrato,
      grauConfianca: 'media',
      justificativa: partesJustificativa.join('; '),
      metricasResumo: partesResumo.join(' | '),
    }
  }

  // 5. Prioridade E: Fator de impacto JCR pré-cadastrado na publicação
  if (
    pub.fator_impacto_jcr !== undefined &&
    pub.fator_impacto_jcr !== null &&
    pub.fator_impacto_jcr > 0
  ) {
    const jcr = Number(pub.fator_impacto_jcr)
    const mapped = mapearJcrParaQualis(jcr)
    partesJustificativa.push(
      `Fator de impacto JCR cadastrado (${jcr.toFixed(2)}) [${mapped.faixa}] → sugerido ${mapped.estrato}`,
    )
    partesResumo.push(`JCR ${jcr.toFixed(2)}`)
    return {
      ...base,
      estratoSugerido: mapped.estrato,
      grauConfianca: 'media',
      justificativa: partesJustificativa.join('; '),
      metricasResumo: partesResumo.join(' | '),
    }
  }

  // 6. Sem métricas encontráveis: NUNCA inventa estrato
  return {
    ...base,
    estratoSugerido: null,
    grauConfianca: 'baixa',
    justificativa:
      'Nenhuma métrica de periódicos identificada no OpenAlex/Scopus — confirmar manualmente.',
    metricasResumo: 'Sem métrica encontrada',
  }
}
