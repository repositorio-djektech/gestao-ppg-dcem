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
  discente_id?: number | null
  egresso_id?: number | null
}

export interface EgressoPDQ {
  id: number
  ano_titulacao?: number | null
  docente_orientador_id?: number | null
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

// ---------------------------------------------------------------------------------------------
// §7º do art. 8º: uma publicação só vale para UM docente (P-34)
// ---------------------------------------------------------------------------------------------
// Quando dois ou mais docentes do programa assinam a mesma publicação, só um pode usá-la no PDQ:
//   I.   o docente indica a quem ela é atribuída (publicacoes.docente_atribuido_id);
//   II.  sem indicação, vale o orientador do discente (ou egresso) coautor;
//   III. a coordenação controla as atribuições para evitar dupla contagem.
// Quando não há indicação e o orientador não resolve (nenhum, ou orientadores diferentes), a
// publicação continua valendo para todos os autores e fica marcada como CONFLITO, para a coordenação
// decidir; nada é descartado em silêncio.

export type RegraAtribuicao = 'unico' | 'indicado' | 'orientador' | 'sem_regra'

export interface OrientadoresPDQ {
  discente: Map<number, number | null>
  egresso: Map<number, number | null>
}

export function montarOrientadores(
  discentes: Array<{ id: number; docente_orientador_id?: number | null }>,
  egressos: Array<{ id: number; docente_orientador_id?: number | null }>,
): OrientadoresPDQ {
  const d = new Map<number, number | null>()
  for (const x of discentes) d.set(Number(x.id), x.docente_orientador_id ?? null)
  const e = new Map<number, number | null>()
  for (const x of egressos) e.set(Number(x.id), x.docente_orientador_id ?? null)
  return { discente: d, egresso: e }
}

export function atribuirPublicacao(params: {
  docentesVinculados: number[]
  atribuidoId?: number | null
  coautores: CoautorProgramaPDQ[]
  orientadores: OrientadoresPDQ
}): { creditados: number[]; regra: RegraAtribuicao } {
  const vinc = Array.from(new Set(params.docentesVinculados.map(Number)))
  if (vinc.length <= 1) return { creditados: vinc, regra: 'unico' }

  const indicado = params.atribuidoId != null ? Number(params.atribuidoId) : null
  if (indicado !== null && vinc.includes(indicado)) {
    return { creditados: [indicado], regra: 'indicado' }
  }

  const orientadores = new Set<number>()
  for (const c of params.coautores) {
    const t = norm(c.tipo)
    if (t === 'egresso' && c.egresso_id != null) {
      const o = params.orientadores.egresso.get(Number(c.egresso_id))
      if (o != null && vinc.includes(Number(o))) orientadores.add(Number(o))
    } else if ((t === 'orientando' || t === 'discente') && c.discente_id != null) {
      const o = params.orientadores.discente.get(Number(c.discente_id))
      if (o != null && vinc.includes(Number(o))) orientadores.add(Number(o))
    }
  }
  if (orientadores.size === 1) {
    return { creditados: Array.from(orientadores), regra: 'orientador' }
  }
  return { creditados: vinc, regra: 'sem_regra' }
}

export interface PublicacaoComAtribuicao extends PublicacaoPDQ {
  /** Docente(s) a quem a publicação é creditada no PDQ. */
  creditados: number[]
  regra: RegraAtribuicao
}

/**
 * Separa as publicações do docente entre as que contam para ele e as cedidas a outro autor (§7º).
 * `vinculos` = publicacoes_docentes de TODOS os docentes (para saber quem mais assina).
 */
export function aplicarAtribuicao(params: {
  docenteId: number
  publicacoes: PublicacaoPDQ[]
  vinculos: Array<{ publicacao_id: number; docente_id: number }>
  coautores: CoautorProgramaPDQ[]
  orientadores: OrientadoresPDQ
}): {
  contam: PublicacaoPDQ[]
  cedidas: PublicacaoComAtribuicao[]
  conflitos: PublicacaoComAtribuicao[]
} {
  const porPublicacao = new Map<number, number[]>()
  for (const v of params.vinculos) {
    const lista = porPublicacao.get(Number(v.publicacao_id)) ?? []
    lista.push(Number(v.docente_id))
    porPublicacao.set(Number(v.publicacao_id), lista)
  }
  const contam: PublicacaoPDQ[] = []
  const cedidas: PublicacaoComAtribuicao[] = []
  const conflitos: PublicacaoComAtribuicao[] = []
  for (const pub of params.publicacoes) {
    const vinculados = porPublicacao.get(Number(pub.id)) ?? [params.docenteId]
    const r = atribuirPublicacao({
      docentesVinculados: vinculados,
      atribuidoId: (pub as any).docente_atribuido_id ?? null,
      coautores: params.coautores.filter((c) => Number(c.publicacao_id) === Number(pub.id)),
      orientadores: params.orientadores,
    })
    if (r.creditados.includes(params.docenteId)) {
      contam.push(pub)
      if (r.regra === 'sem_regra') conflitos.push({ ...pub, ...r })
    } else {
      cedidas.push({ ...pub, ...r })
    }
  }
  return { contam, cedidas, conflitos }
}

// ---------------------------------------------------------------------------------------------
// Desempate (art. 10, parágrafo único, e art. 11, §1º) (P-34)
// ---------------------------------------------------------------------------------------------
//   I. maior PDQ; II. bolsista PQ ou DT do CNPq, por nível; III. orientar aluno com o menor tempo
//   para conclusão; IV. maior tempo de serviço na UFS.

const NIVEL_BOLSA: Record<string, number> = { SR: 6, '1A': 5, '1B': 4, '1C': 3, '1D': 2, '2': 1 }

/** Nível da bolsa PQ ou DT do CNPq (SR > 1A > 1B > 1C > 1D > 2); 0 se não é PQ nem DT. */
export function nivelBolsaCnpq(bolsa: unknown): number {
  const m = String(bolsa ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .match(/^(PQ|DT)[-_]?(SR|1A|1B|1C|1D|2)$/)
  return m ? NIVEL_BOLSA[m[2]] : 0
}

function mesAbsoluto(v: unknown): number | null {
  const t = String(v ?? '').trim()
  if (!t) return null
  let m = t.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (m) return Number(m[1]) * 12 + Number(m[2])
  m = t.match(/^(\d{2})\/(\d{4})$/) || t.match(/^\d{2}\/(\d{2})\/(\d{4})$/)
  if (m) return Number(m[2]) * 12 + Number(m[1])
  m = t.match(/^(\d{4})$/)
  if (m) return Number(m[1]) * 12 + 2 // só o ano vale fevereiro (D-29)
  return null
}

/**
 * Meses entre o início e o fim do curso. Fim = término, ou a data da defesa se não houver término.
 * Duração zero ou negativa (início provisório do Lattes, P-33) vira null: não entra no desempate.
 */
export function mesesDeCurso(inicio: unknown, fim: unknown, defesa?: unknown): number | null {
  const i = mesAbsoluto(inicio)
  const f = mesAbsoluto(fim) ?? mesAbsoluto(defesa)
  if (i === null || f === null) return null
  const meses = f - i
  return meses > 0 ? meses : null
}

export interface DadosDesempate {
  bolsa_cnpq: string
  nivel_bolsa: number
  menor_tempo_conclusao_meses: number | null
  ingresso_ufs: string
}

export function dadosDesempate(params: {
  bolsaCnpq?: string | null
  ingressoUfs?: string | null
  /** Orientações de mestrado/doutorado concluídas na janela, como orientador principal. */
  concluidas: Array<{ inicio?: unknown; fim?: unknown; data_defesa?: unknown }>
}): DadosDesempate {
  const tempos = params.concluidas
    .map((o) => mesesDeCurso(o.inicio, o.fim, o.data_defesa))
    .filter((n): n is number => n !== null)
  return {
    bolsa_cnpq: String(params.bolsaCnpq ?? ''),
    nivel_bolsa: nivelBolsaCnpq(params.bolsaCnpq),
    menor_tempo_conclusao_meses: tempos.length > 0 ? Math.min(...tempos) : null,
    ingresso_ufs: String(params.ingressoUfs ?? '').trim(),
  }
}

/** Comparador de desempate: negativo se `a` fica à frente de `b`. */
export function compararDesempate(
  a: { pdq: number | null; desempate: DadosDesempate },
  b: { pdq: number | null; desempate: DadosDesempate },
): number {
  const pa = a.pdq ?? -1
  const pb = b.pdq ?? -1
  if (pa !== pb) return pb - pa // maior PDQ primeiro
  if (a.desempate.nivel_bolsa !== b.desempate.nivel_bolsa) {
    return b.desempate.nivel_bolsa - a.desempate.nivel_bolsa
  }
  const ta = a.desempate.menor_tempo_conclusao_meses
  const tb = b.desempate.menor_tempo_conclusao_meses
  if (ta !== tb) {
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb // menor tempo primeiro
  }
  const ua = mesAbsoluto(a.desempate.ingresso_ufs)
  const ub = mesAbsoluto(b.desempate.ingresso_ufs)
  if (ua !== ub) {
    if (ua === null) return 1
    if (ub === null) return -1
    return ua - ub // ingresso mais antigo primeiro (mais tempo de serviço)
  }
  return 0
}

// ---------------------------------------------------------------------------------------------
// Colaboradores e visitantes (art. 11) (P-34)
// ---------------------------------------------------------------------------------------------

/** Art. 11, caput: os colaboradores não podem passar de 20% do total do corpo docente permanente. */
export const LIMITE_COLABORADORES = 0.2

export function limiteColaboradores(permanentes: number, colaboradores: number) {
  const limite = Math.floor(permanentes * LIMITE_COLABORADORES)
  return {
    permanentes,
    colaboradores,
    limite,
    percentual: permanentes > 0 ? round3((colaboradores / permanentes) * 100) : null,
    excede: colaboradores > permanentes * LIMITE_COLABORADORES,
  }
}

/** Art. 11, §4º: colaborador ou visitante que não atende os critérios em 3 avaliações de um ciclo de 4 anos. */
export const AVALIACOES_PARA_DESCREDENCIAR = 3
export const TAMANHO_CICLO_ANOS = 4

export function reprovacoesNoCiclo(
  anoAvaliacao: number,
  atendeEmAno: (anoDaAvaliacao: number) => boolean,
) {
  const anos: number[] = []
  for (let a = anoAvaliacao - (TAMANHO_CICLO_ANOS - 1); a <= anoAvaliacao; a++) anos.push(a)
  const reprovados = anos.filter((a) => !atendeEmAno(a))
  return {
    anos,
    reprovacoes: reprovados.length,
    anos_reprovados: reprovados,
    descredenciar: reprovados.length >= AVALIACOES_PARA_DESCREDENCIAR,
  }
}

// ---------------------------------------------------------------------------------------------
// Veredito por categoria (arts. 8º, 9º e 11) (P-34)
// ---------------------------------------------------------------------------------------------
// A avaliação vale para TODOS os docentes (art. 7º, parágrafo único): permanentes, colaboradores e
// visitantes. Quem atende aos quatro critérios:
//   - permanente: é reconduzido;
//   - colaborador ou visitante: pode ser conduzido à categoria permanente (art. 11, §2º).
// Quem não atende fica como "não atende" (ou "PDQ insuficiente" quando só o critério IV falha);
// o desfecho (descredenciamento, passagem a colaborador) é do Colegiado (arts. 9º a 11º).
// Sem categoria definida não há como avaliar.

export type VereditoIN =
  | 'RECONDUZIDO'
  | 'APTO_PERMANENTE'
  | 'PDQ_INSUFICIENTE'
  | 'NAO_ATENDE'
  | 'NAO_APLICAVEL'

export function decidirVeredito(
  categoria: string | null | undefined,
  i: boolean,
  ii: boolean,
  iii: boolean,
  iv: boolean,
): VereditoIN {
  const cat = String(categoria ?? '')
  if (cat !== 'permanente' && cat !== 'colaborador' && cat !== 'visitante') return 'NAO_APLICAVEL'
  if (i && ii && iii && iv) return cat === 'permanente' ? 'RECONDUZIDO' : 'APTO_PERMANENTE'
  if (i && ii && iii && !iv) return 'PDQ_INSUFICIENTE'
  return 'NAO_ATENDE'
}

/** Texto explicativo que acompanha o veredito (vai junto dos motivos). */
export function observacaoDaCategoria(
  categoria: string | null | undefined,
  veredito: VereditoIN,
): string | null {
  const cat = String(categoria ?? '')
  if (veredito === 'APTO_PERMANENTE') {
    return `Docente ${cat} que atende aos critérios I a IV: pode ser conduzido à categoria de docente permanente (IN 02/2026, art. 11, §2º).`
  }
  if (veredito === 'NAO_APLICAVEL') {
    return 'Docente sem categoria definida (permanente, colaborador ou visitante): defina a categoria para que a avaliação se aplique.'
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Consolidação (usada pelo front e pela Edge Function)
// ---------------------------------------------------------------------------------------------

/** Totais por categoria e por veredito, e o limite de colaboradores (art. 11). */
export function resumirAvaliacoes(avaliacoes: Array<{ categoria?: unknown; veredito?: unknown }>) {
  const t = {
    total_docentes: avaliacoes.length,
    total_permanentes: 0,
    total_colaboradores: 0,
    total_visitantes: 0,
    total_sem_categoria: 0,
    reconduzidos: 0,
    aptos_permanente: 0,
    nao_atendem: 0,
    pdq_insuficiente: 0,
    nao_aplicavel: 0,
  }
  for (const a of avaliacoes) {
    const c = String(a.categoria ?? '')
    if (c === 'permanente') t.total_permanentes += 1
    else if (c === 'colaborador') t.total_colaboradores += 1
    else if (c === 'visitante') t.total_visitantes += 1
    else t.total_sem_categoria += 1

    const v = String(a.veredito ?? '')
    if (v === 'RECONDUZIDO') t.reconduzidos += 1
    else if (v === 'APTO_PERMANENTE') t.aptos_permanente += 1
    else if (v === 'PDQ_INSUFICIENTE') t.pdq_insuficiente += 1
    else if (v === 'NAO_ATENDE') t.nao_atendem += 1
    else t.nao_aplicavel += 1
  }
  return { totais: t, limite: limiteColaboradores(t.total_permanentes, t.total_colaboradores) }
}

/**
 * Art. 11, §4º: para colaboradores e visitantes, refaz as avaliações do ciclo de 4 anos e registra as
 * reprovações. `atendeEmAno(docenteId, ano)` avalia o docente naquele ano de avaliação (janela e nota
 * de corte do ano); no ano corrente usa o resultado já calculado.
 */
export function aplicarCiclo(
  avaliacoes: Array<{
    docente_id: number
    categoria?: unknown
    motivos: string[]
    ciclo?: unknown
    criterio_i: { atendido: boolean }
    criterio_ii: { atendido: boolean }
    criterio_iii: { atendido: boolean }
    criterio_iv: { atendido: boolean }
  }>,
  anoAvaliacao: number,
  atendeEmAno: (docenteId: number, ano: number) => boolean,
): void {
  for (const a of avaliacoes) {
    const c = String(a.categoria ?? '')
    if (c !== 'colaborador' && c !== 'visitante') continue
    const ciclo = reprovacoesNoCiclo(anoAvaliacao, (ano) =>
      ano === anoAvaliacao
        ? a.criterio_i.atendido &&
          a.criterio_ii.atendido &&
          a.criterio_iii.atendido &&
          a.criterio_iv.atendido
        : atendeEmAno(Number(a.docente_id), ano),
    )
    a.ciclo = ciclo
    if (ciclo.descredenciar) {
      a.motivos.push(
        `Não atendeu aos critérios em ${ciclo.reprovacoes} das últimas ${TAMANHO_CICLO_ANOS} avaliações (${ciclo.anos_reprovados.join(', ')}): descredenciamento previsto no art. 11, §4º da IN 02/2026, a ser decidido pelo Colegiado.`,
      )
    }
  }
}
