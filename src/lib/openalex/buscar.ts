/**
 * Serviço de integração com a API pública do OpenAlex.
 * Subetapa O1: Busca de autores por nome (somente consulta, sem persistência em banco).
 * Documentação da API: https://api.openalex.org/
 */

import { normalizarTitulo } from '@/lib/lattes/dedupe'

export interface OpenAlexInstituicao {
  id?: string | null
  display_name?: string | null
  ror?: string | null
  country_code?: string | null
  type?: string | null
  lineage?: string[]
}

export interface OpenAlexAutorCandidato {
  /** ID canônico OpenAlex (ex: "https://openalex.org/A5069892096" ou "A5069892096") */
  id: string
  /** Apenas a parte identificadora alfanumérica (ex: "A5069892096") */
  openalex_id: string
  /** Nome de exibição principal do autor retornado pelo OpenAlex */
  display_name: string
  /** Índice H do autor */
  h_index: number
  /** Quantidade total de trabalhos computados */
  works_count: number
  /** Total de citações recebidas */
  cited_by_count: number
  /** ORCID (se presente no perfil do autor) */
  orcid?: string | null
  /** Nome da última instituição conhecida */
  ultima_instituicao?: string | null
  /** Objeto detalhado da última instituição conhecida (se presente) */
  instituicao?: OpenAlexInstituicao | null
}

export interface BuscarAutoresOpenAlexOpcoes {
  /** Filtro textual opcional para afiliação ou nome de instituição */
  instituicaoFiltro?: string
  /** Quantidade máxima de resultados (padrão 10, máximo 50) */
  limite?: number
  /** Timeout em milissegundos para a requisição HTTP (padrão 10000 ms) */
  timeoutMs?: number
  /** Injeção de fetch customizado para testes ou SSR */
  fetchFn?: typeof fetch
}

export interface ResultadoBuscaOpenAlex {
  sucesso: boolean
  candidatos: OpenAlexAutorCandidato[]
  total: number
  termoBuscado: string
  mensagemErro?: string
}

/**
 * Extrai o ID curto de um ID completo OpenAlex.
 * Exemplo: "https://openalex.org/A5069892096" -> "A5069892096"
 */
export function extrairOpenAlexId(urlOuId: string | null | undefined): string {
  if (!urlOuId) return ''
  const limpo = urlOuId.trim()
  const match = limpo.match(/(A\d+)$/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return limpo.replace(/^https?:\/\/openalex\.org\//i, '')
}

/**
 * Normaliza o termo de busca para a API OpenAlex:
 * reaproveita `normalizarTitulo` do projeto para remover acentos, caracteres estranhos
 * e espaços excessivos, mantendo o texto limpo para query strings.
 */
export function normalizarNomeParaBusca(nome: string | null | undefined): string {
  if (!nome) return ''
  return normalizarTitulo(nome)
}

/**
 * Consulta a API pública da OpenAlex para buscar candidatos a autor por nome.
 *
 * - Endpoint: `https://api.openalex.org/authors?search=...`
 * - Gratuito, sem necessidade de autenticação/API Key.
 * - Resiliente: timeouts, erros de rede ou respostas inválidas são tratados e
 *   retornados com `sucesso: false` e mensagem amigável, nunca estourando exceção não tratada.
 */
export async function buscarAutoresOpenAlex(
  nome: string,
  opcoes: BuscarAutoresOpenAlexOpcoes = {},
): Promise<ResultadoBuscaOpenAlex> {
  const nomeNormalizado = normalizarNomeParaBusca(nome)

  if (!nomeNormalizado) {
    return {
      sucesso: true,
      candidatos: [],
      total: 0,
      termoBuscado: '',
    }
  }

  const { instituicaoFiltro, limite = 10, timeoutMs = 10000, fetchFn = fetch } = opcoes

  const perPage = Math.min(Math.max(1, limite), 50)

  // Construção dos parâmetros de query
  const params = new URLSearchParams()
  params.set('search', nomeNormalizado)
  params.set('per_page', String(perPage))

  const url = `https://api.openalex.org/authors?${params.toString()}`

  // Timeout com AbortController
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GestaoPPGDCEM/0.0.61 (mailto:suporte@posgraduacao.ufba.br)',
      },
    })

    clearTimeout(timer)

    if (!response.ok) {
      return {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: nomeNormalizado,
        mensagemErro: `API OpenAlex retornou status ${response.status} (${response.statusText || 'Erro desconhecido'})`,
      }
    }

    const data = await response.json()
    const results = Array.isArray(data?.results) ? data.results : []
    const totalCount = typeof data?.meta?.count === 'number' ? data.meta.count : results.length

    let candidatos: OpenAlexAutorCandidato[] = results.map((item: any): OpenAlexAutorCandidato => {
      const rawId = item?.id ? String(item.id) : ''
      const openalexId = extrairOpenAlexId(rawId)
      const displayName = item?.display_name ? String(item.display_name) : ''

      // Extração de estatísticas (h_index pode vir em summary_stats.h_index ou direto em h_index)
      const hIndex =
        typeof item?.summary_stats?.h_index === 'number'
          ? item.summary_stats.h_index
          : typeof item?.h_index === 'number'
            ? item.h_index
            : 0

      const worksCount = typeof item?.works_count === 'number' ? item.works_count : 0
      const citedByCount = typeof item?.cited_by_count === 'number' ? item.cited_by_count : 0
      const orcid = item?.orcid ? String(item.orcid) : null

      // Última instituição conhecida (payload da OpenAlex: last_known_institutions[0] ou last_known_institution)
      const instRaw =
        Array.isArray(item?.last_known_institutions) && item.last_known_institutions.length > 0
          ? item.last_known_institutions[0]
          : item?.last_known_institution || null

      let ultimaInstituicao: string | null = null
      let instituicaoObj: OpenAlexInstituicao | null = null

      if (instRaw && typeof instRaw === 'object') {
        ultimaInstituicao = instRaw.display_name ? String(instRaw.display_name) : null
        instituicaoObj = {
          id: instRaw.id ? String(instRaw.id) : null,
          display_name: ultimaInstituicao,
          ror: instRaw.ror ? String(instRaw.ror) : null,
          country_code: instRaw.country_code ? String(instRaw.country_code) : null,
          type: instRaw.type ? String(instRaw.type) : null,
          lineage: Array.isArray(instRaw.lineage) ? instRaw.lineage : undefined,
        }
      }

      return {
        id: rawId,
        openalex_id: openalexId,
        display_name: displayName,
        h_index: hIndex,
        works_count: worksCount,
        cited_by_count: citedByCount,
        orcid,
        ultima_instituicao: ultimaInstituicao,
        instituicao: instituicaoObj,
      }
    })

    // Filtro opcional pós-busca por afiliação/instituição se especificado
    if (instituicaoFiltro && instituicaoFiltro.trim().length > 0) {
      const filtroNorm = normalizarTitulo(instituicaoFiltro)
      candidatos = candidatos.filter((c) => {
        if (!c.ultima_instituicao) return false
        const instNorm = normalizarTitulo(c.ultima_instituicao)
        return instNorm.includes(filtroNorm)
      })
    }

    return {
      sucesso: true,
      candidatos,
      total: totalCount,
      termoBuscado: nomeNormalizado,
    }
  } catch (erro: any) {
    clearTimeout(timer)

    const isAbort = erro?.name === 'AbortError'
    const mensagemErro = isAbort
      ? `A requisição para o OpenAlex excedeu o tempo limite de ${timeoutMs / 1000}s`
      : `Erro de conexão ao consultar OpenAlex: ${erro?.message || 'Falha de rede'}`

    return {
      sucesso: false,
      candidatos: [],
      total: 0,
      termoBuscado: nomeNormalizado,
      mensagemErro,
    }
  }
}
