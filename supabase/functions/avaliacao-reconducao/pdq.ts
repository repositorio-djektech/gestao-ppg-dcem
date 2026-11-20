// PDQ do docente conforme a Instrução Normativa 02/2026/P²CEM, art. 8º, §5º, IV (D-36).
//
// Módulo PURO e sem imports: é usado pela Edge Function (`logica.ts`) e pelo front
// (`src/lib/reconducao/calculo.ts`), para a regra existir num lugar só.
//
//   PDQ = (2 × ATD) + DPIDE1 + DPTDE1, tudo do docente avaliado, na janela da avaliação
//   (os 4 anos civis anteriores ao ano da avaliação: avaliação em 2026 usa 2022 a 2025).
//
//   ATD    = artigos A1–A4 com coautoria de discente e/ou egresso (até 5 anos) / (M + 2D)
//   DPIDE1 = A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, 1)    (B1 = "A5" da IN, satura em 1)
//   DPTDE1 = artigos completos (periódicos + anais) com coautoria de discente/egresso, máx. 4
//   Critério IV: PDQ >= nota de corte (definida todo ano pelo Colegiado; padrão 1,0).
//
// Coeficientes: A4 = 0,675 e saturação em B1, como na ficha CAPES 2025 (D-02), que é o que o
// restante do sistema usa. A IN escreve 0,625 e "A5" (classificação antiga): divergência registrada
// na P-37, para a coordenação confirmar.

export const NOTA_CORTE_PADRAO = 1.0
export const JANELA_EGRESSO_ANOS = 5
export const TETO_DPTDE1 = 4

export const NOTA_METODOLOGICA_PDQ =
  'PDQ = (2 × ATD) + DPIDE1 + DPTDE1 (IN 02/2026, art. 8º, §5º, IV), calculado só com a produção e as orientações do docente nos 4 anos civis anteriores ao ano da avaliação. Conta a publicação com coautoria confirmada de discente ou de egresso titulado há até 5 anos. Sem titulações no período (M + 2D = 0) o ATD não é calculável e entra como 0. O critério IV é atendido quando o PDQ alcança a nota de corte definida pelo Colegiado para o ano da avaliação.'

export interface JanelaAvaliacao {
  anoAvaliacao: number
  anoInicio: number
  anoFim: number
}

/** Janela da avaliação do docente: os 4 anos civis anteriores ao ano da avaliação. */
export function janelaAvaliacaoDocente(anoAvaliacao: number): JanelaAvaliacao {
  return { anoAvaliacao, anoInicio: anoAvaliacao - 4, anoFim: anoAvaliacao - 1 }
}

function norm(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export interface CoautorProgramaPDQ {
  publicacao_id: number
  tipo: string
  nome_citado?: string | null
  egresso_id?: number | null
}

export interface EgressoPDQ {
  id: number
  ano_titulacao?: number | null
}

export interface PublicacaoPDQ {
  id: number
  ano?: number | string | null
  estrato_qualis?: string | null
  tipo_producao?: string | null
  periodico?: string | null
  [outro: string]: any
}

export type StatusCoautoria = 'confirmado' | 'pendente' | 'sem_coautoria'

export interface PublicacaoClassificada extends PublicacaoPDQ {
  status_coautoria: StatusCoautoria
  coautores_programa_nomes?: string[]
}

export interface DetalhesPDQ {
  /** Publicações do docente no período com coautoria confirmada (valem para ATD/DPIDE1/DPTDE1). */
  np: number
  /** Todas as publicações do docente no período. */
  np_teto: number
  /** Publicações ainda sem confirmação de coautoria. */
  np_pendente: number
  msc: number
  dsc: number
  titulacoes_total: number
  /** Sem regra de mínimo de titulações na IN; mantido como `true` por compatibilidade. */
  precondicao_atendida: boolean
  pdq: number
  meta_atingida: boolean
  observacao_simplificacao_coautoria: string
  // IN 02/2026
  atd: number
  /** false quando M + 2D = 0: o ATD não é calculável e entra como 0. */
  atd_calculavel: boolean
  atd_artigos: number
  dpide1: number
  dpide1_decomposicao: {
    a1: number
    a2: number
    a3: number
    a4: number
    b1_bruto: number
    b1_saturado: number
  }
  dptde1: number
  dptde1_bruto: number
  nota_corte: number
}

export interface ResultadoCriterioIV {
  detalhes: DetalhesPDQ
  atendido: boolean
  detalhe: string
  confirmadas: PublicacaoClassificada[]
  pendentes: PublicacaoClassificada[]
  semCoautoria: PublicacaoClassificada[]
  /** Motivo pelo qual o critério IV não foi atendido (vazio quando atendido). */
  motivo: string
}

function round3(n: number): number {
  return Number(n.toFixed(3))
}

/** Pontos de DPIDE1 (periódicos A1–A4, B1 saturado em 1 por docente). */
export function pontuarDPIDE1(publicacoes: PublicacaoPDQ[]) {
  let a1 = 0
  let a2 = 0
  let a3 = 0
  let a4 = 0
  let b1 = 0
  for (const p of publicacoes) {
    const e = String(p.estrato_qualis ?? '')
      .toUpperCase()
      .trim()
    if (e === 'A1') a1++
    else if (e === 'A2') a2++
    else if (e === 'A3') a3++
    else if (e === 'A4') a4++
    else if (e === 'B1') b1++
  }
  const b1Saturado = Math.min(b1, 1)
  return {
    a1,
    a2,
    a3,
    a4,
    b1_bruto: b1,
    b1_saturado: b1Saturado,
    pontos: round3(a1 + 0.875 * a2 + 0.75 * a3 + 0.675 * a4 + 0.5 * b1Saturado),
  }
}

/** Artigo completo (periódico ou anais); capítulo e demais tipos ficam fora do DPTDE1 da IN. */
export function ehArtigoCompleto(p: PublicacaoPDQ): boolean {
  const tp = norm(p.tipo_producao)
  if (tp === 'trabalho em anais') return true
  if (tp === 'capitulo') return false
  if (tp === 'artigo em periodico' || tp === '' || Boolean(p.periodico)) return true
  return true
}

/**
 * Coautoria válida da publicação: discente ou orientando conta sempre; egresso conta se a
 * publicação é de até 5 anos após a titulação (sem ano de titulação, o dado real não é descartado).
 */
export function coautoriaValida(
  pub: PublicacaoPDQ,
  coautores: CoautorProgramaPDQ[],
  egressos: EgressoPDQ[],
): boolean {
  const anoPub = Number(pub.ano)
  const anoTitulacao = new Map<number, number | null>()
  for (const e of egressos) anoTitulacao.set(Number(e.id), e.ano_titulacao ?? null)
  return coautores.some((c) => {
    if (Number(c.publicacao_id) !== Number(pub.id)) return false
    const t = norm(c.tipo)
    if (t === 'orientando' || t === 'discente') return true
    if (t !== 'egresso') return false
    const tit = c.egresso_id != null ? (anoTitulacao.get(Number(c.egresso_id)) ?? null) : null
    if (tit === null || !Number.isFinite(anoPub)) return true
    return anoPub <= tit + JANELA_EGRESSO_ANOS
  })
}

/**
 * Critério IV do docente (PDQ da IN). `publicacoesDoDocente` já vem filtrada pela janela e pelo
 * vínculo com o docente; aqui só classifica a coautoria e calcula.
 */
export function avaliarCriterioIV(params: {
  publicacoesDoDocente: PublicacaoPDQ[]
  coautoresPrograma: CoautorProgramaPDQ[]
  egressos: EgressoPDQ[]
  msc: number
  dsc: number
  notaCorte?: number
}): ResultadoCriterioIV {
  const { publicacoesDoDocente, coautoresPrograma, egressos, msc, dsc } = params
  const notaCorte =
    params.notaCorte !== undefined && Number.isFinite(params.notaCorte)
      ? Number(params.notaCorte)
      : NOTA_CORTE_PADRAO

  const semCoautoriaIds = new Set(
    coautoresPrograma
      .filter((c) => norm(c.tipo) === 'sem_coautoria')
      .map((c) => Number(c.publicacao_id)),
  )

  const confirmadas: PublicacaoClassificada[] = []
  const pendentes: PublicacaoClassificada[] = []
  const semCoautoria: PublicacaoClassificada[] = []

  for (const pub of publicacoesDoDocente) {
    if (coautoriaValida(pub, coautoresPrograma, egressos)) {
      const nomes = coautoresPrograma
        .filter(
          (c) =>
            Number(c.publicacao_id) === Number(pub.id) &&
            ['orientando', 'discente', 'egresso'].includes(norm(c.tipo)) &&
            c.nome_citado,
        )
        .map((c) => String(c.nome_citado))
      confirmadas.push({ ...pub, status_coautoria: 'confirmado', coautores_programa_nomes: nomes })
    } else if (semCoautoriaIds.has(Number(pub.id))) {
      semCoautoria.push({ ...pub, status_coautoria: 'sem_coautoria' })
    } else {
      pendentes.push({ ...pub, status_coautoria: 'pendente' })
    }
  }

  // ATD: A1–A4 com coautoria / (M + 2D)
  const artigosA1A4 = confirmadas.filter((p) =>
    ['A1', 'A2', 'A3', 'A4'].includes(
      String(p.estrato_qualis ?? '')
        .toUpperCase()
        .trim(),
    ),
  )
  const denominadorAtd = msc + 2 * dsc
  const atdCalculavel = denominadorAtd > 0
  const atd = atdCalculavel ? round3(artigosA1A4.length / denominadorAtd) : 0

  const dpi = pontuarDPIDE1(confirmadas)
  const dptBruto = confirmadas.filter(ehArtigoCompleto).length
  const dptde1 = Math.min(dptBruto, TETO_DPTDE1)

  const pdq = round3(2 * atd + dpi.pontos + dptde1)
  const metaAtingida = pdq >= notaCorte

  const detalhes: DetalhesPDQ = {
    np: confirmadas.length,
    np_teto: publicacoesDoDocente.length,
    np_pendente: pendentes.length,
    msc,
    dsc,
    titulacoes_total: msc + dsc,
    precondicao_atendida: true,
    pdq,
    meta_atingida: metaAtingida,
    observacao_simplificacao_coautoria: NOTA_METODOLOGICA_PDQ,
    atd,
    atd_calculavel: atdCalculavel,
    atd_artigos: artigosA1A4.length,
    dpide1: dpi.pontos,
    dpide1_decomposicao: {
      a1: dpi.a1,
      a2: dpi.a2,
      a3: dpi.a3,
      a4: dpi.a4,
      b1_bruto: dpi.b1_bruto,
      b1_saturado: dpi.b1_saturado,
    },
    dptde1,
    dptde1_bruto: dptBruto,
    nota_corte: notaCorte,
  }

  const composicao = `PDQ ${pdq} = 2 × ATD (${atd}${atdCalculavel ? '' : ', sem titulações: considerado 0'}) + DPIDE1 (${dpi.pontos}) + DPTDE1 (${dptde1}). Nota de corte: ${notaCorte}. Publicações com coautoria confirmada: ${confirmadas.length} (pendentes de confirmação: ${pendentes.length}); MSc=${msc}, DSc=${dsc}.`
  const detalhe = metaAtingida
    ? `${composicao} Atinge a nota de corte.`
    : `${composicao} Abaixo da nota de corte.`

  return {
    detalhes,
    atendido: metaAtingida,
    detalhe,
    confirmadas,
    pendentes,
    semCoautoria,
    motivo: metaAtingida
      ? ''
      : `Critério IV não atendido: PDQ (${pdq}) inferior à nota de corte (${notaCorte}).`,
  }
}
