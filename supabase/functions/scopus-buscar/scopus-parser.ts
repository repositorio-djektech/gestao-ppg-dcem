/**
 * Utilitários puros para a integração Scopus.
 * Montagem de query de Author Search e mapeamento das entradas da Elsevier.
 */

export interface ScopusAutorCandidato {
  scopus_id: string
  nome: string
  instituicao?: string | null
  document_count: number
  cited_by_count: number
  orcid?: string | null
}

export interface ScopusRespostaBusca {
  sucesso: boolean
  candidatos: ScopusAutorCandidato[]
  total: number
  termoBuscado: string
  mensagemErro?: string
}

/**
 * Normaliza strings removendo diacríticos e caracteres de controle,
 * mantendo apenas texto legível para queries.
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Remove identificadores e formatações de SCOPUS_ID/AUTHOR_ID
 * Ex: "SCOPUS_ID:6602703039" -> "6602703039"
 * Ex: "AUTHOR_ID:6602703039" -> "6602703039"
 * Ex: "6602703039" -> "6602703039"
 */
export function extrairScopusId(rawId: string | null | undefined): string {
  if (!rawId) return ''
  const digits = String(rawId)
    .replace(/^[a-zA-Z_-]+:/, '')
    .replace(/\D/g, '')
  return digits
}

/**
 * Monta a query para o endpoint /content/search/author da Elsevier.
 * Se o termo for puramente numérico, busca por AU-ID(...).
 * Se tiver nome composto (ex: "Carlos Alberto dos Santos" ou "Santos, Carlos"),
 * monta AUTH-LAST-NAME(...) AND AUTH-FIRST(...).
 * Se for uma palavra só, busca por AUTH-LAST-NAME(...).
 * Se filtroAfiliação for informado, acrescenta AND AFFIL(...).
 */
export function montarScopusQuery(termo: string, filtroAfiliacao?: string): string {
  const termoLimpo = normalizarTexto(termo)
  if (!termoLimpo) return ''

  // Caso seja ID numérico direto
  if (/^\d+$/.test(termoLimpo)) {
    return `AU-ID(${termoLimpo})`
  }

  // Se já tiver vírgula tipo "Sobrenome, Nome"
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
    // Ex: "Ledjane Silva Barreto" -> lastName = "Barreto", firstName = "Ledjane"
    const words = termoLimpo.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      lastName = words[0]
    } else {
      // Ignora preposições no início se houver e pega primeiro e último
      lastName = words[words.length - 1]
      firstName = words[0]
    }
  }

  // Remove caracteres que quebram a sintaxe de parênteses da query do Scopus
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
    const afilLimpa = normalizarTexto(filtroAfiliacao).replace(/[()"]/g, '').trim()
    if (afilLimpa) {
      query += ` AND AFFIL("${afilLimpa}")`
    }
  }

  return query
}

/**
 * Mapeia as entradas retornadas pelo JSON da Elsevier para a estrutura simplificada ScopusAutorCandidato.
 */
export function mapearEntradasScopus(entries: any[]): ScopusAutorCandidato[] {
  if (!Array.isArray(entries)) return []

  const resultado: ScopusAutorCandidato[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    // Extração do scopus_id
    const rawId = entry['dc:identifier'] || entry['author-id'] || entry['@author-id'] || ''
    const scopusId = extrairScopusId(rawId)
    if (!scopusId) continue

    // Extração do nome preferido
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

    // Extração da afiliação / instituição
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

    // Contagens
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
