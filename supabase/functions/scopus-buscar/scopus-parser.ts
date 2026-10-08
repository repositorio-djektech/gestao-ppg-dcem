/**
 * Utilitários puros para a integração Scopus.
 * Pipeline em duas etapas:
 *   Etapa A: Scopus Search (content/search/scopus)
 *   Etapa B: Abstract Retrieval (content/abstract/scopus_id/{id})
 * Agregação dos autores com contagem de documentos e afiliações.
 */

export interface ScopusAutorCandidato {
  scopus_id: string
  nome: string
  instituicao?: string | null
  document_count: number
  cited_by_count: number
  orcid?: string | null
  afiliacoes?: string[]
}

export interface ScopusRespostaBusca {
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
 * Remove identificadores e formatações de SCOPUS_ID/AUTHOR_ID/AUID
 * Ex: "SCOPUS_ID:55490763400" -> "55490763400"
 * Ex: "AUTHOR_ID:55490763400" -> "55490763400"
 * Ex: "author_id/55490763400" -> "55490763400"
 * Ex: "2-s2.0-85123456789" -> "85123456789"
 * Ex: "85123456789" -> "85123456789"
 */
export function extrairScopusId(rawId: string | null | undefined): string {
  if (!rawId) return ''
  const str = String(rawId).trim()
  // Trata formato de URL ou caminho: ex. .../author_id/55490763400
  const lastSlash = str.lastIndexOf('/')
  const candidate = lastSlash >= 0 ? str.slice(lastSlash + 1) : str

  const digits = candidate
    .replace(/^[a-zA-Z0-9_.-]+:/, '')
    .replace(/^2-s2\.0-/, '')
    .replace(/\D/g, '')

  return digits
}

/**
 * Monta a query para o endpoint /content/search/scopus da Elsevier.
 * - Se termo for numérico: AU-ID(123456)
 * - Se contiver vírgula ("Sobrenome, Nome"): AUTHLASTNAME("Sobrenome") and AUTHFIRST("Nome")
 * - Se for nome composto ("Ledjane Silva Barreto"): AUTHLASTNAME("Barreto") and AUTHFIRST("Ledjane")
 * - Se for palavra única: AUTHLASTNAME("Barreto")
 * - Se informado filtro de afiliação: and AFFIL("Sergipe")
 */
export function montarScopusQuery(termo: string, filtroAfiliacao?: string): string {
  const termoLimpo = normalizarTexto(termo)
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
    query = `AUTHLASTNAME("${lastName}") and AUTHFIRST("${firstName}")`
  } else if (lastName) {
    query = `AUTHLASTNAME("${lastName}")`
  } else {
    query = `AUTH("${termoLimpo.replace(/[()"]/g, '')}")`
  }

  if (filtroAfiliacao) {
    const afilLimpa = normalizarTexto(filtroAfiliacao).replace(/[()"]/g, '').trim()
    if (afilLimpa) {
      query += ` and AFFIL("${afilLimpa}")`
    }
  }

  return query
}

/**
 * Extrai os identificadores de documento Scopus (scopus_id ou EID sem prefixo)
 * a partir das entradas do Scopus Search (`search-results.entry`).
 */
export function extrairDocumentIdsDeBusca(entries: any[]): ScopusDocumentoId[] {
  if (!Array.isArray(entries)) return []

  const docs: ScopusDocumentoId[] = []
  const vistos = new Set<string>()

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    // O Scopus Search retorna 'dc:identifier' (ex: "SCOPUS_ID:85123456789") ou 'eid' ("2-s2.0-85123456789")
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

export interface AutorExtraidoDoc {
  scopus_id: string
  nome: string
  afiliacao?: string | null
  orcid?: string | null
}

/**
 * Converte qualquer valor em array (evita erros quando a Elsevier retorna objeto ou string única).
 */
function toArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

/**
 * Extrai autores e suas afiliações da resposta de Abstract Retrieval da Elsevier.
 * Suporta múltiplos layouts retornados pela API:
 * 1. `abstracts-retrieval-response.authors.author` (array ou objeto)
 * 2. `abstracts-retrieval-response.coredata['dc:creator'].author`
 * 3. `abstracts-retrieval-response.item.bibrecord.head['author-group']`
 */
export function extrairAutoresDeAbstractRetrieval(abstractJson: any): AutorExtraidoDoc[] {
  if (!abstractJson || typeof abstractJson !== 'object') return []

  const root =
    abstractJson['abstracts-retrieval-response'] ||
    abstractJson['abstract-retrieval-response'] ||
    abstractJson

  // Mapa de afiliações globais do documento: id/afid -> nome
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

  // Helper para adicionar autor deduplicado dentro deste documento
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

  // 1. Caminho principal: root.authors.author
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

      // Afiliação do autor
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

      // Fallback para a primeira afiliação do documento se autor não especificou
      if (!afiliacao && affilMap.size > 0) {
        afiliacao = affilMap.values().next().value || null
      }

      registrarAutor(rawAuid, nome, afiliacao, au['@orcid'] || au.orcid)
    }
  }

  // 2. Caminho alternativo: root.coredata['dc:creator'].author
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

  // 3. Caminho detalhado de bibrecord: root.item.bibrecord.head['author-group']
  const headAuthorGroups = toArray(
    root.item?.bibrecord?.head?.['author-group'] || root.bibrecord?.head?.['author-group'],
  )
  for (const group of headAuthorGroups) {
    if (!group || typeof group !== 'object') continue

    // Afiliação do grupo
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

export interface DocumentoComAutores {
  scopus_id: string
  title?: string
  cited_by_count?: number
  autores: AutorExtraidoDoc[]
}

/**
 * Agrupa autores extraídos de múltiplos documentos (Abstract Retrieval),
 * acumulando contagem de documentos, somando citações e deduplicando afiliações.
 * Prioriza autores que combinam com o termo pesquisado.
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

      // Prefere nomes mais descritivos / longos
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
    // Ordena as afiliações por frequência decrescente
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

  // Ordenação com pontuação de relevância ao termo pesquisado
  const tokensBusca = normalizarTexto(termoDeFiltro || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)

  return candidatos.sort((a, b) => {
    if (tokensBusca.length > 0) {
      const nomeA = normalizarTexto(a.nome).toLowerCase()
      const nomeB = normalizarTexto(b.nome).toLowerCase()

      const matchA = tokensBusca.filter((t) => nomeA.includes(t)).length
      const matchB = tokensBusca.filter((t) => nomeB.includes(t)).length

      if (matchA !== matchB) {
        return matchB - matchA // Mais matches com o termo vêm na frente
      }
    }

    if (b.document_count !== a.document_count) {
      return b.document_count - a.document_count
    }

    return b.cited_by_count - a.cited_by_count
  })
}

/**
 * Fallback caso o Abstract Retrieval falhe ou a resposta do Search já contenha autores
 */
export function mapearEntradasScopus(
  entries: any[],
  termoDeFiltro?: string,
): ScopusAutorCandidato[] {
  if (!Array.isArray(entries) || entries.length === 0) return []

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
