import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  montarScopusQuery,
  extrairDocumentIdsDeBusca,
  extrairAutoresDeAbstractRetrieval,
  agregarAutoresDeAbstracts,
  mapearEntradasScopus,
  type ScopusRespostaBusca,
  type DocumentoComAutores,
} from './scopus-parser.ts'

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Endpoint administrativo/teste para checar logs e telemetria
  const inspectLogs = new URL(req.url).searchParams.get('inspect_logs')
  if (inspectLogs) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && serviceKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/scopus_val_log?select=*&order=id.desc&limit=5`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      )
      const logsData = await res.json()
      return new Response(JSON.stringify(logsData), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  try {
    let body: any = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      body = {
        termo: url.searchParams.get('termo') || '',
        filtroAfiliacao: url.searchParams.get('filtroAfiliacao') || undefined,
        limite: url.searchParams.get('limite') ? Number(url.searchParams.get('limite')) : undefined,
      }
    }

    const termo = typeof body.termo === 'string' ? body.termo.trim() : ''
    const filtroAfiliacao =
      typeof body.filtroAfiliacao === 'string' ? body.filtroAfiliacao.trim() : undefined
    // Limite de documentos a consultar no Abstract Retrieval (5 a 8 para respeitar cota e latência)
    const limite = Math.min(Math.max(1, Number(body.limite) || 5), 8)

    if (!termo) {
      const resVazia: ScopusRespostaBusca = {
        sucesso: true,
        candidatos: [],
        total: 0,
        termoBuscado: '',
      }
      return new Response(JSON.stringify(resVazia), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Leitura segura da chave Scopus do cofre de ambiente (nunca exposta na resposta)
    const apiKey = Deno.env.get('SCOPUS_API_KEY')
    if (!apiKey) {
      const resErroConfig: ScopusRespostaBusca = {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
        mensagemErro:
          'A chave de API Scopus (SCOPUS_API_KEY) não está configurada no backend. Entre em contato com o suporte.',
      }
      return new Response(JSON.stringify(resErroConfig), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Helper para registrar telemetria em public.scopus_val_log
    const logVal = async (stage: string, data: any) => {
      console.log(`[scopus-buscar][${stage}]`, JSON.stringify(data))
      if (!supabaseUrl || !serviceKey) {
        console.warn('[scopus-buscar] supabaseUrl or serviceKey not available:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!serviceKey,
        })
        return
      }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/scopus_val_log`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ stage, data }),
        })
        if (!res.ok) {
          console.warn(
            '[scopus-buscar] failed to log to scopus_val_log:',
            res.status,
            await res.text().catch(() => ''),
          )
        }
      } catch (logErr: any) {
        console.warn('[scopus-buscar] error writing to scopus_val_log:', logErr?.message)
      }
    }

    // ==========================================
    // ETAPA A: Scopus Search (content/search/scopus)
    // Com fallback automático: AUTHOR-NAME -> AUTHLASTNAME
    // ==========================================
    const executarSearch = async (
      queryStr: string,
      tentativa: 'author_name' | 'fallback_authlastname',
    ) => {
      const searchUrl = new URL('https://api.elsevier.com/content/search/scopus')
      searchUrl.searchParams.set('query', queryStr)
      searchUrl.searchParams.set('count', String(Math.max(limite, 10)))
      searchUrl.searchParams.set('view', 'STANDARD')

      await logVal('etapa_a_search_init', { termo, query: queryStr, limite, tentativa })

      const searchController = new AbortController()
      const searchTimer = setTimeout(() => searchController.abort(), 12000)

      try {
        const resp = await fetch(searchUrl.toString(), {
          method: 'GET',
          signal: searchController.signal,
          headers: {
            Accept: 'application/json',
            'X-ELS-APIKey': apiKey,
          },
        })
        return { ok: true as const, resp }
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError'
        await logVal('etapa_a_search_network_error', {
          isTimeout,
          message: err?.message,
          tentativa,
          query: queryStr,
        })
        return { ok: false as const, isTimeout, error: err }
      } finally {
        clearTimeout(searchTimer)
      }
    }

    let queryUsada = montarScopusQuery(termo, filtroAfiliacao, { usarFallbackSobrenome: false })
    let houveFallback = false
    let tentativaExec: 'author_name' | 'fallback_authlastname' = 'author_name'

    let searchResult = await executarSearch(queryUsada, tentativaExec)

    if (!searchResult.ok) {
      const resTimeout: ScopusRespostaBusca = {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
        mensagemErro: searchResult.isTimeout
          ? 'Tempo limite excedido ao consultar a busca Scopus. Tente novamente.'
          : 'Não foi possível conectar ao serviço Elsevier Scopus. Verifique a conexão.',
      }
      return new Response(JSON.stringify(resTimeout), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let searchResp = searchResult.resp

    if (!searchResp.ok) {
      let mensagemAmigavel = `Falha na consulta Scopus Search (status ${searchResp.status}).`
      if (searchResp.status === 401) {
        mensagemAmigavel =
          'Chave da API Scopus inválida ou expirada. Verifique o cadastro no painel.'
      } else if (searchResp.status === 403) {
        mensagemAmigavel = 'Acesso não autorizado ao recurso Scopus. O plano pode não ter acesso.'
      } else if (searchResp.status === 429) {
        mensagemAmigavel =
          'Limite de requisições semanais da API Scopus excedido (quota). Aguarde a renovação.'
      } else if (searchResp.status >= 500) {
        mensagemAmigavel =
          'Os servidores da Elsevier Scopus estão temporariamente indisponíveis. Tente novamente mais tarde.'
      }

      const errBody = await searchResp.text().catch(() => '')
      await logVal('etapa_a_search_http_error', {
        status: searchResp.status,
        mensagemAmigavel,
        errBody: errBody.slice(0, 300),
        query: queryUsada,
        apiKeyLength: apiKey?.length,
      })

      const resErroHttp: ScopusRespostaBusca = {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
        mensagemErro: mensagemAmigavel,
      }
      return new Response(JSON.stringify(resErroHttp), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let searchData = await searchResp.json()
    let searchResults = searchData?.['search-results']
    let entries = searchResults?.entry || []
    let totalDocsRaw = searchResults?.['opensearch:totalResults']
    let totalDocs = Number(totalDocsRaw) || (Array.isArray(entries) ? entries.length : 0)

    let docIds = extrairDocumentIdsDeBusca(entries).slice(0, limite)

    // FALLBACK: se a busca com AUTHOR-NAME retornar 0 docs válidos, tenta AUTHLASTNAME sozinho
    if (docIds.length === 0 && !/^\d+$/.test(termo.trim())) {
      const queryFallback = montarScopusQuery(termo, filtroAfiliacao, {
        usarFallbackSobrenome: true,
      })
      if (queryFallback && queryFallback !== queryUsada) {
        await logVal('etapa_a_fallback_triggered', {
          queryOriginal: queryUsada,
          queryFallback,
          motivo: 'AUTHOR-NAME retornou 0 documentos válidos',
        })

        const fallbackResult = await executarSearch(queryFallback, 'fallback_authlastname')
        if (fallbackResult.ok && fallbackResult.resp.ok) {
          const fallbackData = await fallbackResult.resp.json()
          const fbSearchResults = fallbackData?.['search-results']
          const fbEntries = fbSearchResults?.entry || []
          const fbTotalDocsRaw = fbSearchResults?.['opensearch:totalResults']
          const fbTotalDocs =
            Number(fbTotalDocsRaw) || (Array.isArray(fbEntries) ? fbEntries.length : 0)
          const fbDocIds = extrairDocumentIdsDeBusca(fbEntries).slice(0, limite)

          if (fbDocIds.length > 0) {
            queryUsada = queryFallback
            houveFallback = true
            tentativaExec = 'fallback_authlastname'
            searchResp = fallbackResult.resp
            searchData = fallbackData
            searchResults = fbSearchResults
            entries = fbEntries
            totalDocs = fbTotalDocs
            docIds = fbDocIds
          }
        }
      }
    }

    await logVal('etapa_a_search_success', {
      totalDocs,
      entriesFound: Array.isArray(entries) ? entries.length : 0,
      docIdsToRetrieve: docIds.map((d) => d.scopus_id),
      queryUsada,
      houveFallback,
    })

    if (docIds.length === 0) {
      // Nenhum documento retornado nem com query primária nem com fallback
      const resVazia: ScopusRespostaBusca = {
        sucesso: true,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
      }
      return new Response(JSON.stringify(resVazia), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // ==========================================
    // ETAPA B: Abstract Retrieval para os N docs
    // ==========================================
    // Executa as chamadas em paralelo limitado com tolerância parcial a falhas individuais
    const docsComAutores: DocumentoComAutores[] = []
    const retrievalLogs: any[] = []

    await Promise.all(
      docIds.map(async (doc) => {
        const abstractUrl = `https://api.elsevier.com/content/abstract/scopus_id/${doc.scopus_id}`
        const retrievalController = new AbortController()
        const retrievalTimer = setTimeout(() => retrievalController.abort(), 8000)

        try {
          const aResp = await fetch(abstractUrl, {
            method: 'GET',
            signal: retrievalController.signal,
            headers: {
              Accept: 'application/json',
              'X-ELS-APIKey': apiKey,
            },
          })

          if (!aResp.ok) {
            retrievalLogs.push({ scopus_id: doc.scopus_id, status: aResp.status, ok: false })
            return
          }

          const aData = await aResp.json()
          const autoresExtraidos = extrairAutoresDeAbstractRetrieval(aData)
          retrievalLogs.push({
            scopus_id: doc.scopus_id,
            status: aResp.status,
            ok: true,
            autoresCount: autoresExtraidos.length,
            primeiroAutor: autoresExtraidos[0]
              ? { id: autoresExtraidos[0].scopus_id, nome: autoresExtraidos[0].nome }
              : null,
          })

          docsComAutores.push({
            scopus_id: doc.scopus_id,
            title: doc.title,
            cited_by_count: doc.cited_by_count,
            autores: autoresExtraidos,
          })
        } catch (fetchErr: any) {
          retrievalLogs.push({
            scopus_id: doc.scopus_id,
            error: fetchErr?.message || 'timeout/network',
            ok: false,
          })
        } finally {
          clearTimeout(retrievalTimer)
        }
      }),
    )

    // Agregação dos candidatos a partir dos documentos recuperados
    let candidatos: any[] = []
    if (docsComAutores.length > 0) {
      candidatos = agregarAutoresDeAbstracts(docsComAutores, termo)
    }

    await logVal('etapa_b_retrieval_complete', {
      docsRequested: docIds.length,
      docsSucceeded: docsComAutores.length,
      retrievalLogs,
      candidatosEncontrados: candidatos.length,
      candidatos: candidatos.slice(0, 10).map((c) => ({
        scopus_id: c.scopus_id,
        nome: c.nome,
        instituicao: c.instituicao,
        document_count: c.document_count,
        afiliacoes: c.afiliacoes,
      })),
    })

    const mensagemErro =
      candidatos.length === 0
        ? `Nenhum autor correspondente ao termo "${termo}" foi encontrado nos documentos recuperados.`
        : undefined

    const resSucesso: ScopusRespostaBusca = {
      sucesso: true,
      candidatos,
      total: totalDocs,
      termoBuscado: termo,
      mensagemErro,
    }

    return new Response(JSON.stringify(resSucesso), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    const resErroFatal: ScopusRespostaBusca = {
      sucesso: false,
      candidatos: [],
      total: 0,
      termoBuscado: '',
      mensagemErro: err?.message || 'Erro inesperado ao processar busca de autores no Scopus.',
    }
    return new Response(JSON.stringify(resErroFatal), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
