/**
 * Utilitários para busca e mapeamento de perfis na API Scopus (Elsevier).
 * Espelha a lógica de parsing da Edge Function (Pipeline de duas etapas: Search + Abstract Retrieval).
 */

import { normalizarTitulo } from '@/lib/lattes/dedupe'

export interface ScopusAutorCandidato {
  /** Apenas dígitos (ex: "55490763400") */
  scopus_id: string
  /** Nome preferido do autor retornado pelo Scopus */
  nome: string
  /** Nome da instituição ou afiliação principal */
  instituicao?: string | null
  /** Contagem de documentos indexados em que o autor apareceu */
  document_count: number
  /** Contagem de citações acumuladas */
  cited_by_count: number
  /** ORCID (se presente no cadastro Scopus) */
  orcid?: string | null
  /** Lista de afiliações distintas encontradas para o autor */
  afiliacoes?: string[]
}

export interface BuscarAutoresScopusOpcoes {
  /** Filtro textual opcional para afiliação/instituição */
  filtroAfiliacao?: string
  /** Limite de documentos a consultar no Abstract Retrieval (5 a 8) */
  limite?: number
}

export interface ResultadoBuscaScopus {
  sucesso: boolean
  candidatos: ScopusAutorCandidato[]
  total: number
  termoBuscado: string
  mensagemErro?: string
}

export interface ScopusDocumentoId {
  scopus_id: string
  title?: string
  cited_by_count?: number
}

export interface AutorExtraidoDoc {
  scopus_id: string
  nome: string
  afiliacao?: string | null
  orcid?: string | null
}

export interface DocumentoComAutores {
  scopus_id: string
  title?: string
  cited_by_count?: number
  autores: AutorExtraidoDoc[]
}

/**
 * Normaliza um ID bruto removendo prefixos como "SCOPUS_ID:" ou caminhos "author_id/..."
 * e caracteres não numéricos.
 * Ex: "SCOPUS_ID:55490763400" -> "55490763400"
 * Ex: "author_id/55490763400" -> "55490763400"
 */
export function extrairScopusId(rawId: string | null | undefined): string {
  if (!rawId) return ''
  const str = String(rawId).trim()
  const lastSlash = str.lastIndexOf('/')
  const candidate = lastSlash >= 0 ? str.slice(lastSlash + 1) : str

  return candidate
    .replace(/^[a-zA-Z0-9_.-]+:/, '')
    .replace(/^2-s2\.0-/, '')
    .replace(/\D/g, '')
}

/**
 * Normaliza o termo de busca removendo acentos e espaços extras.
 */
export function normalizarNomeParaScopus(nome: string | null | undefined): string {
  if (!nome) return ''
  return normalizarTitulo(nome)
}

/**
 * Reordena o nome se vier no formato "Sobrenome, Nome" para "Nome Sobrenome".
 * Remove pontuações desnecessárias mantendo espaços limpos.
 */
export function reordenarNomeSeComVirgula(nome: string): string {
  if (!nome) return ''
  const str = nome.trim()
  if (!str.includes(',')) return str.replace(/\s+/g, ' ').trim()

  const parts = str
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    const sobrenome = parts[0]
    const resto = parts.slice(1).join(' ')
    return `${resto} ${sobrenome}`.replace(/\s+/g, ' ').trim()
  }
  return parts[0] || str
}

/**
 * Extrai o último token de um nome completo como sobrenome para fallback.
 */
export function extrairUltimoSobrenome(nome: string): string {
  const limpo = reordenarNomeSeComVirgula(nome)
  const tokens = limpo.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''
  return tokens[tokens.length - 1].replace(/[()"]/g, '').trim()
}

/**
 * Monta a query para o endpoint /content/search/scopus da Elsevier.
 * - Se termo for numérico: AU-ID(123456)
 * - Se usar AUTHOR-NAME: AUTHOR-NAME("<nome completo>") com reordenação se houver vírgula
 * - Fallback para sobrenome: AUTHLASTNAME("<sobrenome>")
 * - Se informado filtro de afiliação: and AFFIL("Sergipe")
 */
export function montarScopusQuery(
  termo: string,
  filtroAfiliacao?: string,
  opcoes?: { usarFallbackSobrenome?: boolean },
): string {
  const termoLimpo = normalizarNomeParaScopus(termo)
  if (!termoLimpo) return ''

  // Se for ID numérico direto
  if (/^\d+$/.test(termoLimpo)) {
    return `AU-ID(${termoLimpo})`
  }

  let query = ''

  if (opcoes?.usarFallbackSobrenome) {
    const sobrenome = extrairUltimoSobrenome(termoLimpo)
    if (sobrenome) {
      query = `AUTHLASTNAME(${sobrenome})`
    } else {
      query = `AUTHOR-NAME(${termoLimpo.replace(/[()"]/g, '')})`
    }
  } else {
    const nomeReordenado = reordenarNomeSeComVirgula(termoLimpo).replace(/[()"]/g, '').trim()
    query = `AUTHOR-NAME(${nomeReordenado})`
  }

  if (filtroAfiliacao) {
    const afilLimpa = normalizarNomeParaScopus(filtroAfiliacao).replace(/[()"]/g, '').trim()
    if (afilLimpa) {
      query += ` and AFFIL("${afilLimpa}")`
    }
  }

  return query
}

/**
 * Extrai identificadores de documento do Scopus Search (`search-results.entry`)
 */
export function extrairDocumentIdsDeBusca(entries: any[]): ScopusDocumentoId[] {
  if (!Array.isArray(entries)) return []

  const docs: ScopusDocumentoId[] = []
  const vistos = new Set<string>()

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    // Se a entrada for um aviso de erro/vazio (ex: {"error": "Result set was empty"})
    if (entry.error || (entry['@_fa'] === 'false' && !entry['dc:identifier'] && !entry.eid)) {
      continue
    }

    const rawId = entry['dc:identifier'] || entry.eid || entry['prism:url'] || ''
    const scopusId = extrairScopusId(rawId)
    if (!scopusId || vistos.has(scopusId)) continue

    vistos.add(scopusId)
    const citedCount = Number(entry['citedby-count'] ?? 0)

    docs.push({
      scopus_id: scopusId,
      title: entry['dc:title'] || '',
      cited_by_count: Number.isFinite(citedCount) ? citedCount : 0,
    })
  }

  return docs
}

function toArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

/**
 * Extrai autores e afiliações do JSON de Abstract Retrieval da Elsevier
 */
export function extrairAutoresDeAbstractRetrieval(abstractJson: any): AutorExtraidoDoc[] {
  if (!abstractJson || typeof abstractJson !== 'object') return []

  const root =
    abstractJson['abstracts-retrieval-response'] ||
    abstractJson['abstract-retrieval-response'] ||
    abstractJson

  const affilMap = new Map<string, string>()
  const affilsRaw = toArray(root.affiliation)
  for (const aff of affilsRaw) {
    if (!aff || typeof aff !== 'object') continue
    const id = String(aff['@id'] || aff.afid || aff['affiliation-id'] || '').trim()
    const name = String(aff.affilname || aff['affiliation-name'] || aff.name || '').trim()
    if (id && name) affilMap.set(id, name)
  }

  const autoresEncontrados: AutorExtraidoDoc[] = []
  const idsVistosNoDoc = new Set<string>()

  const registrarAutor = (
    rawAuid: any,
    nomeParam: string,
    afiliacaoParam?: string | null,
    orcidParam?: string | null,
  ) => {
    const scopusId = extrairScopusId(rawAuid)
    if (!scopusId || idsVistosNoDoc.has(scopusId)) return

    idsVistosNoDoc.add(scopusId)
    autoresEncontrados.push({
      scopus_id: scopusId,
      nome: nomeParam.trim() || `Autor ${scopusId}`,
      afiliacao: afiliacaoParam?.trim() || null,
      orcid: orcidParam ? String(orcidParam).trim() : null,
    })
  }

  // 1. root.authors.author
  const authorsCore = toArray(root.authors?.author)
  if (authorsCore.length > 0) {
    for (const au of authorsCore) {
      if (!au || typeof au !== 'object') continue
      const rawAuid =
        au['@auid'] || au.auid || au.authid || au['author-id'] || au['@id'] || au['author-url']

      const prefName = au['preferred-name'] || {}
      const surname = au['ce:surname'] || prefName['ce:surname'] || au.surname || ''
      const givenName =
        au['ce:given-name'] ||
        prefName['ce:given-name'] ||
        au['ce:initials'] ||
        prefName['ce:initials'] ||
        au['given-name'] ||
        ''
      const indexedName = au['ce:indexed-name'] || prefName['ce:indexed-name'] || au.authname || ''

      let nome = ''
      if (surname && givenName) {
        nome = `${givenName} ${surname}`.trim()
      } else if (indexedName) {
        nome = indexedName
      } else if (surname) {
        nome = surname
      }

      let afiliacao: string | null = null
      const auAffils = toArray(au.affiliation)
      for (const af of auAffils) {
        if (!af) continue
        const afId = typeof af === 'object' ? String(af['@id'] || af.afid || '') : String(af)
        if (afId && affilMap.has(afId)) {
          afiliacao = affilMap.get(afId)!
          break
        }
        if (typeof af === 'object' && (af.affilname || af['affiliation-name'])) {
          afiliacao = String(af.affilname || af['affiliation-name'])
          break
        }
      }

      if (!afiliacao && affilMap.size > 0) {
        afiliacao = affilMap.values().next().value || null
      }

      registrarAutor(rawAuid, nome, afiliacao, au['@orcid'] || au.orcid)
    }
  }

  // 2. root.coredata['dc:creator'].author
  const creatorAuthors = toArray(root.coredata?.['dc:creator']?.author)
  if (creatorAuthors.length > 0) {
    for (const au of creatorAuthors) {
      if (!au || typeof au !== 'object') continue
      const rawAuid = au['@auid'] || au.auid || au['author-url'] || au['@id']
      const prefName = au['preferred-name'] || {}
      const surname = au['ce:surname'] || prefName['ce:surname'] || au.surname || ''
      const givenName =
        au['ce:given-name'] ||
        prefName['ce:given-name'] ||
        au['ce:initials'] ||
        prefName['ce:initials'] ||
        ''
      const indexedName = au['ce:indexed-name'] || prefName['ce:indexed-name'] || ''

      let nome = ''
      if (surname && givenName) {
        nome = `${givenName} ${surname}`.trim()
      } else if (indexedName) {
        nome = indexedName
      } else if (surname) {
        nome = surname
      }

      let afiliacao: string | null = null
      const afObj = au.affiliation
      if (afObj) {
        const afId =
          typeof afObj === 'object' ? String(afObj['@id'] || afObj.afid || '') : String(afObj)
        if (afId && affilMap.has(afId)) {
          afiliacao = affilMap.get(afId)!
        }
      }
      if (!afiliacao && affilMap.size > 0) {
        afiliacao = affilMap.values().next().value || null
      }

      registrarAutor(rawAuid, nome, afiliacao, au['@orcid'] || au.orcid)
    }
  }

  // 3. root.item.bibrecord.head['author-group']
  const headAuthorGroups = toArray(
    root.item?.bibrecord?.head?.['author-group'] || root.bibrecord?.head?.['author-group'],
  )
  for (const group of headAuthorGroups) {
    if (!group || typeof group !== 'object') continue

    let groupAffilName: string | null = null
    const gAff = group.affiliation
    if (gAff && typeof gAff === 'object') {
      const org = gAff.organization
      if (typeof org === 'string') {
        groupAffilName = org
      } else if (Array.isArray(org)) {
        groupAffilName = org
          .map((o) => (typeof o === 'string' ? o : o?.['$'] || ''))
          .filter(Boolean)
          .join(', ')
      } else if (org && typeof org === 'object') {
        groupAffilName = org['$'] || null
      }
      if (!groupAffilName && gAff['@afid']) {
        groupAffilName = affilMap.get(String(gAff['@afid'])) || null
      }
    }

    const groupAuthors = toArray(group.author)
    for (const au of groupAuthors) {
      if (!au || typeof au !== 'object') continue
      const rawAuid = au['@auid'] || au.auid || au['@id']
      const surname = au['ce:surname'] || au.surname || ''
      const givenName = au['ce:given-name'] || au['ce:initials'] || au['given-name'] || ''
      const indexedName = au['ce:indexed-name'] || ''

      let nome = ''
      if (surname && givenName) {
        nome = `${givenName} ${surname}`.trim()
      } else if (indexedName) {
        nome = indexedName
      } else if (surname) {
        nome = surname
      }

      registrarAutor(
        rawAuid,
        nome,
        groupAffilName || affilMap.values().next().value || null,
        au['@orcid'],
      )
    }
  }

  return autoresEncontrados
}

/**
 * Agrupa autores a partir dos documentos processados pelo Abstract Retrieval
 */
export function agregarAutoresDeAbstracts(
  docs: DocumentoComAutores[],
  termoDeFiltro?: string,
): ScopusAutorCandidato[] {
  if (!Array.isArray(docs)) return []

  const autoresPorId = new Map<
    string,
    {
      scopus_id: string
      nome: string
      document_count: number
      cited_by_count: number
      orcid?: string | null
      afiliacoesFreq: Map<string, number>
    }
  >()

  for (const doc of docs) {
    const validCitations = Number.isFinite(doc.cited_by_count) ? (doc.cited_by_count as number) : 0
    const vistosNesteDoc = new Set<string>()

    for (const au of doc.autores || []) {
      const id = au.scopus_id
      if (!id || vistosNesteDoc.has(id)) continue
      vistosNesteDoc.add(id)

      let registro = autoresPorId.get(id)
      if (!registro) {
        registro = {
          scopus_id: id,
          nome: au.nome,
          document_count: 0,
          cited_by_count: 0,
          orcid: au.orcid || null,
          afiliacoesFreq: new Map<string, number>(),
        }
        autoresPorId.set(id, registro)
      }

      registro.document_count += 1
      registro.cited_by_count += validCitations

      if (au.nome && au.nome.length > registro.nome.length) {
        registro.nome = au.nome
      }

      if (au.orcid && !registro.orcid) {
        registro.orcid = au.orcid
      }

      if (au.afiliacao) {
        const afilTrim = au.afiliacao.trim()
        if (afilTrim) {
          const freq = registro.afiliacoesFreq.get(afilTrim) || 0
          registro.afiliacoesFreq.set(afilTrim, freq + 1)
        }
      }
    }
  }

  const candidatos: ScopusAutorCandidato[] = Array.from(autoresPorId.values()).map((aut) => {
    const afilsOrdenadas = Array.from(aut.afiliacoesFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome]) => nome)

    return {
      scopus_id: aut.scopus_id,
      nome: aut.nome,
      instituicao: afilsOrdenadas[0] || null,
      document_count: aut.document_count,
      cited_by_count: aut.cited_by_count,
      orcid: aut.orcid,
      afiliacoes: afilsOrdenadas,
    }
  })

  const tokensBusca = normalizarNomeParaScopus(termoDeFiltro || '')
    .split(/\s+/)
    .filter((w) => w.length > 2)

  return candidatos.sort((a, b) => {
    if (tokensBusca.length > 0) {
      const nomeA = normalizarNomeParaScopus(a.nome)
      const nomeB = normalizarNomeParaScopus(b.nome)

      const matchA = tokensBusca.filter((t) => nomeA.includes(t)).length
      const matchB = tokensBusca.filter((t) => nomeB.includes(t)).length

      if (matchA !== matchB) {
        return matchB - matchA
      }
    }

    if (b.document_count !== a.document_count) {
      return b.document_count - a.document_count
    }

    return b.cited_by_count - a.cited_by_count
  })
}

/**
 * Fallback para mapeamento de entradas Scopus
 */
export function mapearEntradasScopus(
  entries: any[],
  termoDeFiltro?: string,
): ScopusAutorCandidato[] {
  if (!Array.isArray(entries) || entries.length === 0) return []

  const primeira = entries[0]
  if (
    primeira &&
    (primeira['preferred-name'] ||
      (primeira['dc:identifier'] && String(primeira['dc:identifier']).startsWith('AUTHOR_ID')))
  ) {
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
        afiliacoes: instituicao ? [instituicao] : [],
      })
    }
    return resultado
  }

  const docsSimulados: DocumentoComAutores[] = entries.map((entry) => {
    const rawId = entry['dc:identifier'] || entry.eid || ''
    const scopusId = extrairScopusId(rawId)
    const citedCount = Number(entry['citedby-count'] ?? 0)

    const rawAuthors = toArray(entry.author)
    const autores: AutorExtraidoDoc[] = []
    for (const a of rawAuthors) {
      if (!a || typeof a !== 'object') continue
      const rawAuid = a.authid || a.auid || a['author-id'] || a['@auid']
      const id = extrairScopusId(rawAuid)
      if (!id) continue
      const nome =
        a.authname ||
        `${a['given-name'] || a.initials || ''} ${a.surname || ''}`.trim() ||
        `Autor ${id}`
      autores.push({ scopus_id: id, nome, afiliacao: null })
    }

    return {
      scopus_id: scopusId,
      cited_by_count: Number.isFinite(citedCount) ? citedCount : 0,
      autores,
    }
  })

  return agregarAutoresDeAbstracts(docsSimulados, termoDeFiltro)
}
