import {
  normalizarTextoNome,
  dividirAutoresTexto,
  decomporNome,
  calcularSimilaridadeNome,
} from '@/lib/reconducao/matching-coautoria'
import type { Docente, Publicacao } from '@/types/database'

export type GrauConfiancaCategoria = 'alta' | 'media' | 'baixa'

export const LIMIAR_ALTA_CONFIANCA = 0.85
export const LIMIAR_MEDIA_CONFIANCA = 0.65

/**
 * Classifica um score numérico [0, 1] em categoria de confiança.
 */
export function classificarGrauConfianca(score: number): GrauConfiancaCategoria {
  if (score >= LIMIAR_ALTA_CONFIANCA) return 'alta'
  if (score >= LIMIAR_MEDIA_CONFIANCA) return 'media'
  return 'baixa'
}

export interface SugestaoCasamentoDocente {
  docenteId: number
  docenteNome: string
  docenteCategoria?: string | null
  docenteStatus?: boolean
  autorTrecho: string
  grauConfiancaScore: number // 0.00 a 1.00
  grauConfianca: GrauConfiancaCategoria // 'alta' | 'media' | 'baixa'
  justificativa: string // ex: "Ledjane S. Barreto → Ledjane Silva Barreto — alta (Sobrenome + primeiro nome idênticos)"
  jaVinculado: boolean
  rejeitadoAnteriormente: boolean
  selecionadoPadrao: boolean // true se alta confiança e não rejeitado e não já vinculado
}

export interface SugestaoPublicacaoCasamento {
  publicacaoId: number
  publicacaoTitulo: string
  publicacaoAno: number
  publicacaoAutoresTexto: string
  sugestoes: SugestaoCasamentoDocente[]
  /** Total de sugestões pendentes de decisão (não vinculadas ainda) */
  totalPendentes: number
  /** Total de sugestões de alta confiança */
  totalAltaConfianca: number
}

export interface RelatorioCasamentoGeral {
  publicacoesAnalisadas: number
  publicacoesComSugestao: number
  totalSugestoes: number
  totalAltaConfianca: number
  totalMediaConfianca: number
  totalBaixaConfianca: number
  totalJaVinculadas: number
  itens: SugestaoPublicacaoCasamento[]
}

/**
 * Analisa uma lista de autores em formato de texto livre contra a lista de docentes,
 * detectando todas as variações e calculando o score tolerante.
 *
 * Suporta:
 * - Ledjane Silva Barreto (exato)
 * - Barreto, Ledjane Silva (ordem trocada com vírgula)
 * - BARRETO, L. S. ou Barreto, L. (sobrenome + iniciais)
 * - VALERIO, Mario e G (iniciais compostas)
 * - Macedo, Z.S. (iniciais coladas com ponto)
 * - Acentos e normalização (Zélia vs ZELIA, Mário vs Mario)
 * - Homônimos parciais discriminados pelo score (Silva sozinho pontua baixo se não casar primeiro nome/inicial)
 */
export function casarAutoresComDocente(
  autorTrecho: string,
  docente: Pick<Docente, 'id' | 'nome'>,
): { match: boolean; score: number; motivo: string } {
  // 1. Testa com o motor padrão de matching
  const baseSim = calcularSimilaridadeNome(autorTrecho, docente.nome)
  if (baseSim.match && baseSim.score >= 0.7) {
    return baseSim
  }

  // 2. Extensão para casos com iniciais coladas, ex: "Macedo, Z.S." ou "Valerio, M. E. G."
  const partesAutor = decomporNome(autorTrecho)
  const partesDocente = decomporNome(docente.nome)

  if (partesAutor.tokens.length === 0 || partesDocente.tokens.length === 0) {
    return { match: false, score: 0, motivo: '' }
  }

  // Verifica se o último sobrenome coincide ou está contido
  const mesmoSobrenome =
    partesAutor.ultimoSobrenome.length > 2 &&
    (partesAutor.ultimoSobrenome === partesDocente.ultimoSobrenome ||
      partesDocente.tokens.includes(partesAutor.ultimoSobrenome))

  if (mesmoSobrenome) {
    // Compara inicial do primeiro nome
    const inicialDoc = partesDocente.primeiroNome ? partesDocente.primeiroNome[0] : ''
    const inicialAut = partesAutor.primeiroNome ? partesAutor.primeiroNome[0] : ''

    // Se as iniciais batem
    if (inicialDoc && inicialAut && inicialDoc === inicialAut) {
      // Se autor tem tokens adicionais que batem com as outras iniciais do docente
      // Ex: "Valerio, M. E. G." vs "Mario Ernesto Giroldo Valerio"
      const iniciaisDocenteResto = partesDocente.tokens.map((t) => t[0]).filter(Boolean)
      const iniciaisAutorResto = partesAutor.tokens.map((t) => t[0]).filter(Boolean)

      const todasIniciaisAutorNoDoc = iniciaisAutorResto.every((i) =>
        iniciaisDocenteResto.includes(i),
      )

      if (todasIniciaisAutorNoDoc && iniciaisAutorResto.length >= 2) {
        return {
          match: true,
          score: 0.88,
          motivo: `Sobrenome (${partesAutor.ultimoSobrenome}) e múltiplas iniciais compatíveis (${iniciaisAutorResto.join('.').toUpperCase()}.)`,
        }
      }

      return {
        match: true,
        score: 0.75,
        motivo: `Sobrenome (${partesAutor.ultimoSobrenome}) + inicial compatível (${inicialAut.toUpperCase()}.)`,
      }
    }
  }

  return baseSim
}

/**
 * Gera as sugestões de casamento de autores para uma única publicação.
 */
export function sugerirCasamentosParaPublicacao(params: {
  publicacao: Pick<Publicacao, 'id' | 'titulo' | 'ano' | 'autores'>
  docentes: Docente[]
  docentesJaVinculadosIds?: Set<number>
  docentesRejeitadosIds?: Set<string | number>
}): SugestaoPublicacaoCasamento {
  const {
    publicacao,
    docentes,
    docentesJaVinculadosIds = new Set(),
    docentesRejeitadosIds = new Set(),
  } = params

  const segmentos = dividirAutoresTexto(publicacao.autores)
  const sugestoesMap = new Map<number, SugestaoCasamentoDocente>()

  for (const seg of segmentos) {
    for (const d of docentes) {
      const matchRes = casarAutoresComDocente(seg, d)
      if (matchRes.match && matchRes.score >= 0.5) {
        const jaVinculado = docentesJaVinculadosIds.has(d.id)
        const rejeitadoAnteriormente =
          docentesRejeitadosIds.has(d.id) || docentesRejeitadosIds.has(String(d.id))
        const grauConfianca = classificarGrauConfianca(matchRes.score)

        const justificativaFormatada = `${seg.trim()} → ${d.nome} — ${grauConfianca} (${matchRes.motivo})`

        const existente = sugestoesMap.get(d.id)
        // Se encontrou mais de um segmento que combina com o mesmo docente, mantém a maior confiança
        if (!existente || matchRes.score > existente.grauConfiancaScore) {
          sugestoesMap.set(d.id, {
            docenteId: d.id,
            docenteNome: d.nome,
            docenteCategoria: d.categoria,
            docenteStatus: d.status,
            autorTrecho: seg.trim(),
            grauConfiancaScore: matchRes.score,
            grauConfianca,
            justificativa: justificativaFormatada,
            jaVinculado,
            rejeitadoAnteriormente,
            selecionadoPadrao: !jaVinculado && !rejeitadoAnteriormente && grauConfianca === 'alta',
          })
        }
      }
    }
  }

  const sugestoes = Array.from(sugestoesMap.values()).sort(
    (a, b) => b.grauConfiancaScore - a.grauConfiancaScore,
  )

  const totalPendentes = sugestoes.filter((s) => !s.jaVinculado && !s.rejeitadoAnteriormente).length
  const totalAltaConfianca = sugestoes.filter((s) => s.grauConfianca === 'alta').length

  return {
    publicacaoId: publicacao.id,
    publicacaoTitulo: publicacao.titulo,
    publicacaoAno: publicacao.ano,
    publicacaoAutoresTexto: publicacao.autores || '',
    sugestoes,
    totalPendentes,
    totalAltaConfianca,
  }
}

/**
 * Analisa em lote todas as publicações contra todos os docentes cadastrados,
 * gerando o relatório completo com separação por confiança e identificação de já vinculados.
 */
export function analisarCasamentosEmLote(params: {
  publicacoes: Publicacao[]
  docentes: Docente[]
  vinculosExistentes?: Array<{ publicacao_id: number; docente_id: number }>
  rejeitados?: Array<{ origem_identificador: string; alvo_identificador: string }>
}): RelatorioCasamentoGeral {
  const { publicacoes, docentes, vinculosExistentes = [], rejeitados = [] } = params

  // Mapeia vínculos existentes por publicacao_id
  const mapaVinculos = new Map<number, Set<number>>()
  for (const v of vinculosExistentes) {
    if (!mapaVinculos.has(v.publicacao_id)) {
      mapaVinculos.set(v.publicacao_id, new Set())
    }
    mapaVinculos.get(v.publicacao_id)!.add(Number(v.docente_id))
  }

  // Mapeia rejeições por publicacao_id
  const mapaRejeicoes = new Map<number, Set<number>>()
  for (const r of rejeitados) {
    const pubId = Number(r.origem_identificador)
    const docId = Number(r.alvo_identificador)
    if (!isNaN(pubId) && !isNaN(docId)) {
      if (!mapaRejeicoes.has(pubId)) {
        mapaRejeicoes.set(pubId, new Set())
      }
      mapaRejeicoes.get(pubId)!.add(docId)
    }
  }

  let totalSugestoes = 0
  let totalAltaConfianca = 0
  let totalMediaConfianca = 0
  let totalBaixaConfianca = 0
  let totalJaVinculadas = 0

  const itens: SugestaoPublicacaoCasamento[] = []

  for (const pub of publicacoes) {
    const vinculados = mapaVinculos.get(pub.id) || new Set()
    const rejeitadosPub = mapaRejeicoes.get(pub.id) || new Set()

    const item = sugerirCasamentosParaPublicacao({
      publicacao: pub,
      docentes,
      docentesJaVinculadosIds: vinculados,
      docentesRejeitadosIds: rejeitadosPub,
    })

    if (item.sugestoes.length > 0) {
      itens.push(item)
      for (const sug of item.sugestoes) {
        totalSugestoes++
        if (sug.jaVinculado) totalJaVinculadas++
        if (sug.grauConfianca === 'alta') totalAltaConfianca++
        else if (sug.grauConfianca === 'media') totalMediaConfianca++
        else totalBaixaConfianca++
      }
    }
  }

  return {
    publicacoesAnalisadas: publicacoes.length,
    publicacoesComSugestao: itens.length,
    totalSugestoes,
    totalAltaConfianca,
    totalMediaConfianca,
    totalBaixaConfianca,
    totalJaVinculadas,
    itens,
  }
}
