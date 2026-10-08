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
 * Reordena o nome se vier no formato "Sobrenome, Nome" para "Nome Sobrenome".
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
  const termoLimpo = normalizarTexto(termo)
  if (!termoLimpo) return ''

  // Caso seja ID numérico direto
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

    // Se a entrada for um aviso de erro/vazio (ex: {"error": "Result set was empty"})
    if (entry.error || (entry['@_fa'] === 'false' && !entry['dc:identifier'] && !entry.eid)) {
      continue
    }

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
      const surname =
        au['ce:surname'] || au.surname || prefName['ce:surname'] || prefName.surname || ''
      const givenName =
        au['ce:given-name'] ||
        au['given-name'] ||
        au['ce:initials'] ||
        au.initials ||
        prefName['ce:given-name'] ||
        prefName['given-name'] ||
        prefName['ce:initials'] ||
        prefName.initials ||
        ''
      const indexedName =
        au['ce:indexed-name'] ||
        au.authname ||
        prefName['ce:indexed-name'] ||
        prefName['indexed-name'] ||
        ''

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
  const dcCreatorObj = root.coredata?.['dc:creator']
  if (typeof dcCreatorObj === 'string' && dcCreatorObj.trim()) {
    const creatorName = dcCreatorObj.trim()
    const rootAuid = root.coredata?.['dc:identifier'] || ''
    registrarAutor(rootAuid, creatorName, affilMap.values().next().value || null)
  }

  const creatorAuthors = toArray(root.coredata?.['dc:creator']?.author)
  if (creatorAuthors.length > 0) {
    for (const au of creatorAuthors) {
      if (!au || typeof au !== 'object') continue
      const rawAuid = au['@auid'] || au.auid || au['author-url'] || au['@id']
      const prefName = au['preferred-name'] || {}
      const surname =
        au['ce:surname'] || au.surname || prefName['ce:surname'] || prefName.surname || ''
      const givenName =
        au['ce:given-name'] ||
        au['given-name'] ||
        au['ce:initials'] ||
        au.initials ||
        prefName['ce:given-name'] ||
        prefName['given-name'] ||
        prefName['ce:initials'] ||
        prefName.initials ||
        ''
      const indexedName =
        au['ce:indexed-name'] || prefName['ce:indexed-name'] || prefName['indexed-name'] || ''

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
/**
 * Normaliza texto para comparação e deduplicação:
 * - minúsculas, decomposição NFD sem acentos, sem pontuação, espaços colapsados.
 */
export function normalizarTextoParaComparacao(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai tokens significativos a partir de um texto normalizado.
 * Descarta stopwords comuns do português/inglês (da, de, do, dos, das, van, der, etc.).
 */
export function extrairTokensRelevantes(texto: string | null | undefined): string[] {
  if (!texto) return []
  const norm = normalizarTextoParaComparacao(texto)
  const stopwords = new Set([
    'de',
    'da',
    'do',
    'dos',
    'das',
    'e',
    'van',
    'der',
    'von',
    'del',
    'la',
    'le',
  ])
  return norm
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))
}

/**
 * Avalia a semelhança entre o nome do candidato e o termo de busca.
 * Retorna pontuação de casamento:
 * - tokens termo casados no nome
 * - se casou todos os tokens do termo
 * - se casou o sobrenome (último token relevante)
 * - booleano casou (deve ter sobreposição de pelo menos 1 token relevante, ou match exato de ID)
 */
export function calcularSemelhancaNomeTermo(
  nomeCandidato: string,
  termoBusca: string,
): {
  casou: boolean
  tokensCasados: number
  totalTokensTermo: number
  casouTodosTokensTermo: boolean
  casouSobrenome: boolean
} {
  const normCandidato = normalizarTextoParaComparacao(nomeCandidato)
  const normTermo = normalizarTextoParaComparacao(termoBusca)

  if (!normTermo) {
    return {
      casou: true,
      tokensCasados: 0,
      totalTokensTermo: 0,
      casouTodosTokensTermo: false,
      casouSobrenome: false,
    }
  }

  // Se o termo for numérico (Scopus ID)
  if (/^\d+$/.test(normTermo)) {
    return {
      casou: true,
      tokensCasados: 1,
      totalTokensTermo: 1,
      casouTodosTokensTermo: true,
      casouSobrenome: true,
    }
  }

  // Se match exato
  if (normCandidato === normTermo) {
    const tokensTermo = extrairTokensRelevantes(normTermo)
    return {
      casou: true,
      tokensCasados: tokensTermo.length,
      totalTokensTermo: tokensTermo.length,
      casouTodosTokensTermo: true,
      casouSobrenome: true,
    }
  }

  const tokensCandidato = extrairTokensRelevantes(normCandidato)
  const tokensTermo = extrairTokensRelevantes(normTermo)

  if (tokensTermo.length === 0) {
    return {
      casou: true,
      tokensCasados: 0,
      totalTokensTermo: 0,
      casouTodosTokensTermo: false,
      casouSobrenome: false,
    }
  }

  const setCandidato = new Set(tokensCandidato)
  let tokensCasados = 0

  for (const token of tokensTermo) {
    if (setCandidato.has(token)) {
      tokensCasados += 1
    } else {
      const temPrefixo = tokensCandidato.some((tc) => {
        // Se um dos tokens for inicial isolada (ex: 'l' de 'l s barreto' casa com 'ledjane')
        if (token.length === 1 && tc.startsWith(token)) return true
        if (tc.length === 1 && token.startsWith(tc)) return true
        if (token.length >= 3 && tc.startsWith(token)) return true
        if (tc.length >= 3 && token.startsWith(tc)) return true
        return false
      })
      if (temPrefixo) {
        tokensCasados += 1
      }
    }
  }

  const sobrenomeTermo = tokensTermo[tokensTermo.length - 1]
  const casouSobrenome = Boolean(
    sobrenomeTermo &&
    (setCandidato.has(sobrenomeTermo) ||
      tokensCandidato.some(
        (tc) =>
          (sobrenomeTermo.length >= 3 && tc.startsWith(sobrenomeTermo)) ||
          (tc.length >= 3 && sobrenomeTermo.startsWith(tc)),
      )),
  )

  // O candidato casou se:
  // 1. O sobrenome do termo casou (no Scopus, o sobrenome é a âncora principal do autor)
  // 2. OU pelo menos 2 tokens casaram
  // 3. OU (se o termo só tem 1 token) esse 1 token casou
  const casou =
    casouSobrenome ||
    tokensCasados >= Math.min(2, tokensTermo.length) ||
    (tokensTermo.length === 1 && tokensCasados > 0)
  const casouTodosTokensTermo = tokensCasados >= tokensTermo.length

  return {
    casou,
    tokensCasados,
    totalTokensTermo: tokensTermo.length,
    casouTodosTokensTermo,
    casouSobrenome,
  }
}

/**
 * Agrupa autores extraídos de múltiplos documentos (Abstract Retrieval),
 * acumulando contagem de documentos, somando citações e deduplicando afiliações.
 * Filtra e descarta coautores sem correspondência de tokens com o termo pesquisado.
 * O autor que casou com o termo da busca vem primeiro na lista;
 * rankear os demais por nº de documentos e citações.
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

      // Se o novo nome contiver mais informação e não for apenas iniciais, prioriza
      const nomeExistente = registro.nome
      const nomeNovo = au.nome
      if (nomeNovo) {
        const tokensExistente = extrairTokensRelevantes(nomeExistente)
        const tokensNovo = extrairTokensRelevantes(nomeNovo)
        if (tokensNovo.length > tokensExistente.length || nomeNovo.length > nomeExistente.length) {
          registro.nome = nomeNovo
        }
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

  const termoLimpo = termoDeFiltro ? normalizarTextoParaComparacao(termoDeFiltro) : ''

  // Mapeia e calcula a métrica de semelhança com o termo buscado
  const todosCandidatos = Array.from(autoresPorId.values()).map((aut) => {
    const afilsOrdenadas = Array.from(aut.afiliacoesFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome]) => nome)

    const matchInfo = calcularSemelhancaNomeTermo(aut.nome, termoLimpo)

    return {
      candidato: {
        scopus_id: aut.scopus_id,
        nome: aut.nome,
        instituicao: afilsOrdenadas[0] || null,
        document_count: aut.document_count,
        cited_by_count: aut.cited_by_count,
        orcid: aut.orcid,
        afiliacoes: afilsOrdenadas,
      } as ScopusAutorCandidato,
      matchInfo,
    }
  })

  // Se houver termo de busca, descarta coautores que NÃO casam
  const filtrados = termoLimpo
    ? todosCandidatos.filter((item) => item.matchInfo.casou)
    : todosCandidatos

  // Ordenação:
  // 1. Autor que casou todos os tokens do termo vem antes
  // 2. Maior número de tokens casados com o termo
  // 3. Casou sobrenome do termo
  // 4. Maior número de documentos (document_count)
  // 5. Maior número de citações (cited_by_count)
  filtrados.sort((a, b) => {
    const ma = a.matchInfo
    const mb = b.matchInfo

    if (ma.casouTodosTokensTermo !== mb.casouTodosTokensTermo) {
      return ma.casouTodosTokensTermo ? -1 : 1
    }

    if (ma.tokensCasados !== mb.tokensCasados) {
      return mb.tokensCasados - ma.tokensCasados
    }

    if (ma.casouSobrenome !== mb.casouSobrenome) {
      return ma.casouSobrenome ? -1 : 1
    }

    if (b.candidato.document_count !== a.candidato.document_count) {
      return b.candidato.document_count - a.candidato.document_count
    }

    return b.candidato.cited_by_count - a.candidato.cited_by_count
  })

  return filtrados.map((item) => item.candidato)
}

/**
 * Fallback caso o Abstract Retrieval falhe ou a resposta do Search já contenha autores
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

    if (autores.length === 0 && entry['dc:creator']) {
      const creatorName = String(entry['dc:creator']).trim()
      // Se tiver autor sem auid, associar com id do documento como chave de autor apenas se houver auid no link
      autores.push({ scopus_id: scopusId, nome: creatorName, afiliacao: null })
    }

    return {
      scopus_id: scopusId,
      cited_by_count: Number.isFinite(citedCount) ? citedCount : 0,
      autores,
    }
  })

  return agregarAutoresDeAbstracts(docsSimulados, termoDeFiltro)
}
