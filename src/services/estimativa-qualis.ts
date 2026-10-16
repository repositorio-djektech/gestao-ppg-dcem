import { supabase } from '@/lib/supabase/client'
import { EstratoQualis, Publicacao, QualisOrigem } from '@/types/database'
import {
  estimarEstratoQualis,
  MetricasColetadas,
  MetricasFonteOpenAlex,
  MetricasWorkOpenAlex,
  SugestaoEstratoQualis,
} from '@/lib/publicacoes/estimativa-qualis'

export interface ItemGravacaoQualis {
  publicacaoId: number
  estrato: EstratoQualis
  origem: QualisOrigem // 'sugerido_confirmado' | 'manual'
  justificativa?: string
}

export interface ResultadoGravacaoQualis {
  sucessos: number
  ignorados: number
  erros: { publicacaoId: number; erro: string }[]
  atualizadosIds: number[]
}

// Cache em memória durante a sessão para evitar requisições repetidas aos mesmos periódicos
const cacheFontesOpenAlex = new Map<string, MetricasFonteOpenAlex | null>()
const cacheWorksOpenAlex = new Map<string, MetricasWorkOpenAlex | null>()

function limparNomePeriodico(periodico: string): string {
  return periodico
    .replace(/^https?:\/\/[^\s]+/i, '') // remove urls que tenham entrado por engano
    .replace(/\(online\)/gi, '')
    .replace(/\(print\)/gi, '')
    .replace(/\(mdpi\)/gi, '')
    .replace(/published by:.*/gi, '')
    .replace(/[-–—]/g, ' ')
    .trim()
}

function normalizarDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
}

/**
 * Consulta informações do artigo no OpenAlex por DOI para extrair percentil
 */
async function buscarWorkOpenAlex(doi: string): Promise<MetricasWorkOpenAlex | null> {
  const doiLimpo = normalizarDoi(doi)
  if (!doiLimpo) return null

  if (cacheWorksOpenAlex.has(doiLimpo)) {
    return cacheWorksOpenAlex.get(doiLimpo) || null
  }

  try {
    const url = `https://api.openalex.org/works?filter=doi:${encodeURIComponent(doiLimpo)}&per_page=1`
    const res = await fetch(url)
    if (!res.ok) {
      cacheWorksOpenAlex.set(doiLimpo, null)
      return null
    }

    const data = await res.json()
    const work = data.results?.[0]
    if (!work) {
      cacheWorksOpenAlex.set(doiLimpo, null)
      return null
    }

    const percentileMin = work.cited_by_percentile_year?.min ?? null
    const percentileMax = work.cited_by_percentile_year?.max ?? null
    const percentileValue =
      percentileMin !== null && percentileMax !== null
        ? Math.round((percentileMin + percentileMax) / 2)
        : (percentileMin ?? percentileMax ?? null)

    const met: MetricasWorkOpenAlex = {
      workId: work.id,
      percentileMin,
      percentileMax,
      percentileValue,
      citationNormalizedPercentile: work.citation_normalized_percentile?.value ?? null,
      fwci: work.fwci ?? null,
      citedByCount: work.cited_by_count ?? null,
      sourceName: work.primary_location?.source?.display_name ?? null,
      issn: work.primary_location?.source?.issn ?? null,
    }

    cacheWorksOpenAlex.set(doiLimpo, met)
    return met
  } catch {
    cacheWorksOpenAlex.set(doiLimpo, null)
    return null
  }
}

/**
 * Consulta métricas do periódico/fonte no OpenAlex por nome
 */
async function buscarFonteOpenAlex(periodico: string): Promise<MetricasFonteOpenAlex | null> {
  const nomeLimpo = limparNomePeriodico(periodico)
  if (!nomeLimpo || nomeLimpo.length < 3) return null

  const cacheKey = nomeLimpo.toLowerCase()
  if (cacheFontesOpenAlex.has(cacheKey)) {
    return cacheFontesOpenAlex.get(cacheKey) || null
  }

  try {
    const url = `https://api.openalex.org/sources?search=${encodeURIComponent(nomeLimpo)}&per_page=1`
    const res = await fetch(url)
    if (!res.ok) {
      cacheFontesOpenAlex.set(cacheKey, null)
      return null
    }

    const data = await res.json()
    const source = data.results?.[0]
    if (!source) {
      cacheFontesOpenAlex.set(cacheKey, null)
      return null
    }

    const met: MetricasFonteOpenAlex = {
      sourceId: source.id,
      displayName: source.display_name,
      issn: source.issn || [],
      citedness2yr: source.summary_stats?.['2yr_mean_citedness'] ?? null,
      hIndex: source.summary_stats?.h_index ?? null,
      worksCount: source.works_count ?? null,
    }

    cacheFontesOpenAlex.set(cacheKey, met)
    return met
  } catch {
    cacheFontesOpenAlex.set(cacheKey, null)
    return null
  }
}

export const estimativaQualisService = {
  /**
   * Obtém publicações que ainda NÃO têm estrato_qualis
   * REGRA DE OURO 2: publicaçoes com estrato_qualis preenchido NUNCA são processadas.
   */
  async obterPublicacoesSemEstrato(): Promise<Publicacao[]> {
    const { data, error } = await supabase
      .from('publicacoes')
      .select('*')
      .is('estrato_qualis', null)
      .order('ano', { ascending: false })

    if (error) {
      console.error('Erro ao buscar publicações sem estrato:', error)
      throw new Error(`Falha ao buscar publicações: ${error.message}`)
    }

    return (data || []) as Publicacao[]
  },

  /**
   * Processa em lote as publicações sem estrato e calcula estimativa para cada uma
   * Respeita concorrência e faz chamadas paralelas leves ao OpenAlex
   */
  async processarSugestoes(
    publicacoes: Publicacao[],
    onProgresso?: (progresso: { atual: number; total: number; titulo: string }) => void,
  ): Promise<SugestaoEstratoQualis[]> {
    const total = publicacoes.length
    const sugestoes: SugestaoEstratoQualis[] = []

    for (let i = 0; i < total; i++) {
      const pub = publicacoes[i]
      if (onProgresso) {
        onProgresso({ atual: i + 1, total, titulo: pub.titulo })
      }

      // Se já tem estrato, pula (garantia dupla de preservação)
      if (pub.estrato_qualis) {
        sugestoes.push(estimarEstratoQualis(pub))
        continue
      }

      // Coleta métricas do OpenAlex em paralelo para esta publicação
      let workMet: MetricasWorkOpenAlex | null = null
      let fonteMet: MetricasFonteOpenAlex | null = null

      try {
        const promises: Promise<any>[] = []
        if (pub.doi) {
          promises.push(buscarWorkOpenAlex(pub.doi).then((w) => (workMet = w)))
        }
        if (pub.periodico) {
          promises.push(buscarFonteOpenAlex(pub.periodico).then((f) => (fonteMet = f)))
        }

        if (promises.length > 0) {
          await Promise.all(promises)
        }
      } catch (err) {
        console.warn(`Erro ao consultar métricas para "${pub.titulo}":`, err)
      }

      const metricas: MetricasColetadas = {
        openalexWork: workMet,
        openalexSource: fonteMet,
      }

      sugestoes.push(estimarEstratoQualis(pub, metricas))
    }

    return sugestoes
  },

  /**
   * Gravação idempotente com confirmação humana explícita.
   * REGRA DE OURO 1 & 2:
   * - Só grava os itens explicitamente confirmados
   * - Publicações que por ventura já possuam estrato_qualis manual no banco não são sobrescritas
   *   sem autorização; verificação atômica WHERE id = item.id.
   * - Grava qualis_origem ('manual' ou 'sugerido_confirmado') e qualis_sugestao_justificativa
   */
  async gravarConfirmacoes(itens: ItemGravacaoQualis[]): Promise<ResultadoGravacaoQualis> {
    const resultado: ResultadoGravacaoQualis = {
      sucessos: 0,
      ignorados: 0,
      erros: [],
      atualizadosIds: [],
    }

    if (itens.length === 0) return resultado

    // Busca estado atual de todas para garantir que não sobrescreve manual existente
    const ids = itens.map((it) => it.publicacaoId)
    const { data: pubsAtuais, error: errBusca } = await supabase
      .from('publicacoes')
      .select('id, estrato_qualis, qualis_origem')
      .in('id', ids)

    if (errBusca) {
      throw new Error(`Falha ao validar publicações existentes: ${errBusca.message}`)
    }

    const mapaAtuais = new Map((pubsAtuais || []).map((p) => [p.id, p]))

    for (const item of itens) {
      const atual = mapaAtuais.get(item.publicacaoId)
      if (!atual) {
        resultado.ignorados++
        continue
      }

      // Se já tiver estrato atribuído E a gravação for "sugerido_confirmado", não sobrescreve se já for manual
      if (
        atual.estrato_qualis &&
        atual.qualis_origem === 'manual' &&
        item.origem === 'sugerido_confirmado'
      ) {
        resultado.ignorados++
        continue
      }

      const { error: errUpdate } = await supabase
        .from('publicacoes')
        .update({
          estrato_qualis: item.estrato,
          qualis_origem: item.origem,
          qualis_sugestao_justificativa: item.justificativa || null,
        })
        .eq('id', item.publicacaoId)

      if (errUpdate) {
        resultado.erros.push({
          publicacaoId: item.publicacaoId,
          erro: errUpdate.message,
        })
      } else {
        resultado.sucessos++
        resultado.atualizadosIds.push(item.publicacaoId)
      }
    }

    return resultado
  },
}
