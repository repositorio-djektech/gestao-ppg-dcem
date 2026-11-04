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

/** Abaixo disso o motor padrão está apoiado só em sobrenome + inicial (0,75): não vincula. */
const SCORE_MINIMO_NOME_POR_EXTENSO = 0.9

const SEM_MATCH = { match: false, score: 0, motivo: '' }

/**
 * Casa um trecho de autores (texto livre) com um docente. H-06: **sobrenome com inicial NÃO vincula**.
 * Em sobrenome comum ("Silva, R.", "Santos, M.") isso atribuía a publicação ao docente errado.
 *
 * Só casa quando o nome do docente aparece por extenso, o que exige o PRIMEIRO NOME completo
 * (não basta inicial nem só sobrenomes). Aceita:
 * - Ledjane Silva Barreto (exato) e Barreto, Ledjane Silva (ordem trocada com vírgula)
 * - MACEDO, ZELIA S. / Zelia S. Macedo (primeiro nome + sobrenome; o resto pode ser inicial)
 * - Acentos e caixa (Zélia vs ZELIA, Mário vs Mario)
 * Não casa: Macedo, Z.S. | VALERIO, M. E. G. | Silva, R. | Santos Silva (sem primeiro nome).
 * O texto é só uma sugestão: o vínculo definitivo é confirmado pelo docente ou pela coordenação.
 */
export function casarAutoresComDocente(
  autorTrecho: string,
  docente: Pick<Docente, 'id' | 'nome'>,
): { match: boolean; score: number; motivo: string } {
  const base = calcularSimilaridadeNome(autorTrecho, docente.nome)
  if (!base.match || base.score < SCORE_MINIMO_NOME_POR_EXTENSO) return SEM_MATCH

  const autor = decomporNome(autorTrecho)
  const alvo = decomporNome(docente.nome)
  const primeiroNomePorExtenso =
    alvo.primeiroNome.length > 1 && autor.tokens.includes(alvo.primeiroNome)
  if (!primeiroNomePorExtenso) return SEM_MATCH

  return base
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
