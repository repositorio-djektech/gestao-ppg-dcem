/**
 * Utilitários puros para a integração Scopus.
 * Montagem de query de Scopus Search (content/search/scopus)
 * e agregação de autores a partir dos documentos retornados.
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
 * Agrupa autores a partir dos documentos retornados pelo endpoint Scopus Search (search-results.entry).
 * Cada documento traz autores em `entry.author` (array ou objeto) ou em `entry['dc:creator']`.
 * Agrupa por auid (Scopus ID), acumulando o número de documentos encontrados por autor,
 * além de capturar a afiliação mais frequente/disponível e o número de citações acumulado (ou 0).
 *
 * Se termoDeFiltro for fornecido (ex: "Ledjane Barreto"), prioriza autores cujo nome casa
 * com o termo procurado.
 */
export function agregarAutoresDeDocumentos(
  entries: any[],
  termoDeFiltro?: string,
): ScopusAutorCandidato[] {
  if (!Array.isArray(entries)) return []

  const autoresPorId = new Map<
    string,
    {
      scopus_id: string
      nome: string
      instituicao: string | null
      document_count: number
      cited_by_count: number
      orcid?: string | null
      afiliacoesFreq: Map<string, number>
    }
  >()

  // Pré-computa mapa de afiliações por afid em cada entry (se houver entry.affiliation)
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    // Mapa auxiliar afid -> affilname dentro do documento
    const affilMap = new Map<string, string>()
    if (Array.isArray(entry.affiliation)) {
      for (const aff of entry.affiliation) {
        const id = String(aff?.afid || aff?.['@id'] || '')
        const name = aff?.affilname || aff?.['affiliation-name'] || ''
        if (id && name) affilMap.set(id, name)
      }
    } else if (entry.affiliation && typeof entry.affiliation === 'object') {
      const id = String(entry.affiliation.afid || entry.affiliation['@id'] || '')
      const name = entry.affiliation.affilname || entry.affiliation['affiliation-name'] || ''
      if (id && name) affilMap.set(id, name)
    }

    const docCitations = Number(entry['citedby-count'] ?? 0)
    const validDocCitations = Number.isFinite(docCitations) ? docCitations : 0

    // Extrai lista de autores do documento
    const authorsRaw = entry.author
    let authorList: any[] = []
    if (Array.isArray(authorsRaw)) {
      authorList = authorsRaw
    } else if (authorsRaw && typeof authorsRaw === 'object') {
      authorList = [authorsRaw]
    }

    // Se não veio entry.author, mas há dc:creator e dc:identifier com autor
    if (authorList.length === 0 && entry['dc:creator']) {
      // Alguns feeds trazem apenas dc:creator sem author list
      const creatorName = String(entry['dc:creator'])
      authorList.push({
        authname: creatorName,
      })
    }

    // Para evitar contar o mesmo autor duas vezes dentro do mesmo documento:
    const vistosNesteDoc = new Set<string>()

    for (const a of authorList) {
      if (!a || typeof a !== 'object') continue

      const rawAuid =
        a.authid || a.auid || a['@auid'] || a['@seq'] || a['dc:identifier'] || a['author-id']
      const scopusId = extrairScopusId(rawAuid)

      // Se não há ID Scopus, não podemos vincular
      if (!scopusId) continue

      if (vistosNesteDoc.has(scopusId)) continue
      vistosNesteDoc.add(scopusId)

      // Monta nome
      let nome = ''
      const surname = a.surname || ''
      const givenName = a['given-name'] || a.initials || ''
      if (surname && givenName) {
        nome = `${givenName} ${surname}`.trim()
      } else if (a.authname) {
        nome = a.authname
      } else if (surname) {
        nome = surname
      } else {
        nome = `Autor ${scopusId}`
      }

      // Descobre afiliação
      let affilName: string | null = null
      // afid pode ser array ou objeto ou string
      if (Array.isArray(a.afid)) {
        for (const afItem of a.afid) {
          const afId = typeof afItem === 'object' ? afItem?.['$'] || afItem?.afid : String(afItem)
          if (afId && affilMap.has(String(afId))) {
            affilName = affilMap.get(String(afId))!
            break
          }
        }
      } else if (a.afid) {
        const afId = typeof a.afid === 'object' ? a.afid?.['$'] || a.afid?.afid : String(a.afid)
        if (afId && affilMap.has(String(afId))) {
          affilName = affilMap.get(String(afId))!
        }
      }

      // Se ainda não achou, pega a primeira afiliação do documento
      if (!affilName && affilMap.size > 0) {
        affilName = affilMap.values().next().value || null
      }

      let autorAgregado = autoresPorId.get(scopusId)
      if (!autorAgregado) {
        autorAgregado = {
          scopus_id: scopusId,
          nome,
          instituicao: affilName,
          document_count: 0,
          cited_by_count: 0,
          orcid: a.orcid ? String(a.orcid) : null,
          afiliacoesFreq: new Map<string, number>(),
        }
        autoresPorId.set(scopusId, autorAgregado)
      }

      autorAgregado.document_count += 1
      autorAgregado.cited_by_count += validDocCitations

      // Prefere nomes mais completos
      if (nome.length > autorAgregado.nome.length) {
        autorAgregado.nome = nome
      }

      if (a.orcid && !autorAgregado.orcid) {
        autorAgregado.orcid = String(a.orcid)
      }

      if (affilName) {
        const count = autorAgregado.afiliacoesFreq.get(affilName) || 0
        autorAgregado.afiliacoesFreq.set(affilName, count + 1)
      }
    }
  }

  // Define a melhor afiliação para cada autor (a mais frequente)
  const candidatos: ScopusAutorCandidato[] = Array.from(autoresPorId.values()).map((aut) => {
    let melhorAfiliacao: string | null = aut.instituicao
    let maiorFreq = 0
    for (const [afNome, freq] of aut.afiliacoesFreq.entries()) {
      if (freq > maiorFreq) {
        maiorFreq = freq
        melhorAfiliacao = afNome
      }
    }

    return {
      scopus_id: aut.scopus_id,
      nome: aut.nome,
      instituicao: melhorAfiliacao,
      document_count: aut.document_count,
      cited_by_count: aut.cited_by_count,
      orcid: aut.orcid,
    }
  })

  // Se houver termo de busca textual (ex: "Ledjane Barreto"), priorizamos candidatos cujo nome
  // contenha tokens relevantes do termo (ex: "barreto" e "ledjane")
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
        return matchB - matchA // Mais matches com o nome buscado vem primeiro
      }
    }

    // Ordenação secundária: contagem de documentos desc
    if (b.document_count !== a.document_count) {
      return b.document_count - a.document_count
    }

    // Terciária: citações desc
    return b.cited_by_count - a.cited_by_count
  })
}

/**
 * Mapeia entradas brutas retornadas do JSON da API Scopus.
 * Suporta tanto o novo formato de agregação via Scopus Search quanto o formato legado de Author Search.
 */
export function mapearEntradasScopus(
  entries: any[],
  termoDeFiltro?: string,
): ScopusAutorCandidato[] {
  if (!Array.isArray(entries) || entries.length === 0) return []

  const primeira = entries[0]
  // Se for o formato de Author Search (tem 'preferred-name' ou 'author-id' direto)
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

  // Formato Scopus Search (documentos com lista de autores agrupada)
  return agregarAutoresDeDocumentos(entries, termoDeFiltro)
}
