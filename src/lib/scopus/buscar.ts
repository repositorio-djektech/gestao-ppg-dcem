/**
 * Utilitários para busca e mapeamento de perfis na API Scopus (Elsevier).
 * Espelha a lógica de parsing da Edge Function e provê funções puras testáveis no frontend.
 */

import { normalizarTitulo } from '@/lib/lattes/dedupe'

export interface ScopusAutorCandidato {
  /** Apenas dígitos (ex: "6602703039") */
  scopus_id: string
  /** Nome preferido do autor retornado pelo Scopus */
  nome: string
  /** Nome da instituição ou afiliação principal */
  instituicao?: string | null
  /** Contagem de documentos indexados (disponível no plano básico) */
  document_count: number
  /** Contagem de citações (disponível no plano básico) */
  cited_by_count: number
  /** ORCID (se presente no cadastro Scopus) */
  orcid?: string | null
}

export interface BuscarAutoresScopusOpcoes {
  /** Filtro textual opcional para afiliação/instituição */
  filtroAfiliacao?: string
  /** Limite de resultados (padrão 10, máximo 25) */
  limite?: number
}

export interface ResultadoBuscaScopus {
  sucesso: boolean
  candidatos: ScopusAutorCandidato[]
  total: number
  termoBuscado: string
  mensagemErro?: string
}

/**
 * Normaliza um ID bruto removendo prefixos como "SCOPUS_ID:" ou "AUTHOR_ID:"
 * e caracteres não numéricos.
 * Ex: "SCOPUS_ID:6602703039" -> "6602703039"
 */
export function extrairScopusId(rawId: string | null | undefined): string {
  if (!rawId) return ''
  const digits = String(rawId)
    .replace(/^[a-zA-Z_-]+:/, '')
    .replace(/\D/g, '')
  return digits
}

/**
 * Normaliza o termo de busca removendo acentos e espaços extras.
 */
export function normalizarNomeParaScopus(nome: string | null | undefined): string {
  if (!nome) return ''
  return normalizarTitulo(nome)
}

/**
 * Monta a query para o endpoint /content/search/author da Elsevier.
 * - Se termo for numérico: AU-ID(123456)
 * - Se contiver vírgula ("Sobrenome, Nome"): AUTH-LAST-NAME("Sobrenome") AND AUTH-FIRST("Nome")
 * - Se for nome composto ("Ledjane Silva Barreto"): AUTH-LAST-NAME("Barreto") AND AUTH-FIRST("Ledjane")
 * - Se for palavra única: AUTH-LAST-NAME("Barreto")
 * - Se informado filtro de afiliação: AND AFFIL("Sergipe")
 */
export function montarScopusQuery(termo: string, filtroAfiliacao?: string): string {
  const termoLimpo = normalizarNomeParaScopus(termo)
  if (!termoLimpo) return ''

  // Caso seja ID numérico direto
  if (/^\d+$/.test(termoLimpo)) {
    return `AU-ID(${termoLimpo})`
  }

  let lastName = ''
  let firstName = ''

  if (termoLimpo.includes(',')) {
    const parts = termoLimpo
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    lastName = parts[0] || ''
    firstName = parts[1] || ''
  } else {
    const words = termoLimpo.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      lastName = words[0]
    } else {
      lastName = words[words.length - 1]
      firstName = words[0]
    }
  }

  lastName = lastName.replace(/[()"]/g, '').trim()
  firstName = firstName.replace(/[()"]/g, '').trim()

  let query = ''
  if (lastName && firstName) {
    query = `AUTH-LAST-NAME("${lastName}") AND AUTH-FIRST("${firstName}")`
  } else if (lastName) {
    query = `AUTH-LAST-NAME("${lastName}")`
  } else {
    query = `AUTH("${termoLimpo.replace(/[()"]/g, '')}")`
  }

  if (filtroAfiliacao) {
    const afilLimpa = normalizarNomeParaScopus(filtroAfiliacao).replace(/[()"]/g, '').trim()
    if (afilLimpa) {
      query += ` AND AFFIL("${afilLimpa}")`
    }
  }

  return query
}

/**
 * Mapeia entradas brutas retornadas do JSON da API Scopus (`search-results.entry`)
 */
export function mapearEntradasScopus(entries: any[]): ScopusAutorCandidato[] {
  if (!Array.isArray(entries)) return []

  const resultado: ScopusAutorCandidato[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    const rawId = entry['dc:identifier'] || entry['author-id'] || entry['@author-id'] || ''
    const scopusId = extrairScopusId(rawId)
    if (!scopusId) continue

    const prefName = entry['preferred-name'] || {}
    const surname = prefName['surname'] || ''
    const givenName = prefName['given-name'] || prefName['initials'] || ''
    let nomeCompleto = ''
    if (surname && givenName) {
      nomeCompleto = `${givenName} ${surname}`.trim()
    } else if (surname) {
      nomeCompleto = surname
    } else if (entry['authname']) {
      nomeCompleto = entry['authname']
    } else {
      nomeCompleto = `Autor ${scopusId}`
    }

    let instituicao: string | null = null
    const affilCurrent = entry['affiliation-current']
    if (affilCurrent && typeof affilCurrent === 'object') {
      instituicao = affilCurrent['affiliation-name'] || null
    }
    if (!instituicao && Array.isArray(entry['affiliation-history'])) {
      const primeiro = entry['affiliation-history'][0]
      if (primeiro && typeof primeiro === 'object') {
        instituicao = primeiro['affiliation-name'] || null
      }
    }

    const docCount = Number(entry['document-count'] ?? 0)
    const citedCount = Number(entry['cited-by-count'] ?? 0)
    const orcid = entry['orcid'] ? String(entry['orcid']) : null

    resultado.push({
      scopus_id: scopusId,
      nome: nomeCompleto,
      instituicao,
      document_count: Number.isFinite(docCount) ? docCount : 0,
      cited_by_count: Number.isFinite(citedCount) ? citedCount : 0,
      orcid,
    })
  }

  return resultado
}
