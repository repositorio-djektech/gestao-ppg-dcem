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
      if (!supabaseUrl || !serviceKey) return
      try {
        await fetch(`${supabaseUrl}/rest/v1/scopus_val_log`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ stage, data }),
        })
      } catch (_) {
        // Falhas de telemetria não afetam o fluxo
      }
    }

    // ==========================================
    // ETAPA A: Scopus Search (content/search/scopus)
    // ==========================================
    const query = montarScopusQuery(termo, filtroAfiliacao)
    const searchUrl = new URL('https://api.elsevier.com/content/search/scopus')
    searchUrl.searchParams.set('query', query)
    searchUrl.searchParams.set('count', String(Math.max(limite, 10)))
    searchUrl.searchParams.set('view', 'STANDARD')

    await logVal('etapa_a_search_init', { termo, query, limite })

    const searchController = new AbortController()
    const searchTimer = setTimeout(() => searchController.abort(), 12000)

    let searchResp: Response
    try {
      searchResp = await fetch(searchUrl.toString(), {
        method: 'GET',
        signal: searchController.signal,
        headers: {
          Accept: 'application/json',
          'X-ELS-APIKey': apiKey,
        },
      })
    } catch (err: any) {
      clearTimeout(searchTimer)
      const isTimeout = err?.name === 'AbortError'
      await logVal('etapa_a_search_network_error', { isTimeout, message: err?.message })

      const resTimeout: ScopusRespostaBusca = {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
        mensagemErro: isTimeout
          ? 'Tempo limite excedido ao consultar a busca Scopus. Tente novamente.'
          : 'Não foi possível conectar ao serviço Elsevier Scopus. Verifique a conexão.',
      }
      return new Response(JSON.stringify(resTimeout), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } finally {
      clearTimeout(searchTimer)
    }

    if (!searchResp.ok) {
      let mensagemAmigavel = `Falha na consulta Scopus Search (status ${searchResp.status}).`
      if (searchResp.status === 401) {
        mensagemAmigavel = 'Chave da API Scopus inválida ou expirada. Verifique o cadastro no painel.'
      } else if (searchResp.status === 403) {
        mensagemAmigavel = 'Acesso não autorizado ao recurso Scopus. O plano pode não ter acesso.'
      } else if (searchResp.status === 429) {
        mensagemAmigavel = 'Limite de requisições semanais da API Scopus excedido (quota). Aguarde a renovação.'
      } else if (searchResp.status >= 500) {
        mensagemAmigavel = 'Os servidores da Elsevier Scopus estão temporariamente indisponíveis. Tente novamente mais tarde.'
      }

      const errBody = await searchResp.text().catch(() => '')
      await logVal('etapa_a_search_http_error', { status: searchResp.status, mensagemAmigavel, errBody: errBody.slice(0, 300) })

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

    const searchData = await searchResp.json()
    const searchResults = searchData?.['search-results']
    const entries = searchResults?.entry || []
    const totalDocsRaw = searchResults?.['opensearch:totalResults']
    const totalDocs = Number(totalDocsRaw) || (Array.isArray(entries) ? entries.length : 0)

    const docIds = extrairDocumentIdsDeBusca(entries).slice(0, limite)

    await logVal('etapa_a_search_success', {
      totalDocs,
      entriesFound: Array.isArray(entries) ? entries.length : 0,
      docIdsToRetrieve: docIds.map((d) => d.scopus_id),
    })

    if (docIds.length === 0) {
      // Nenhum documento retornado na busca
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
    } else {
      // Se todos os Abstract Retrievals falharam, tenta fallback com as entradas brutas do search
      candidatos = mapearEntradasScopus(entries, termo)
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

    const resSucesso: ScopusRespostaBusca = {
      sucesso: true,
      candidatos,
      total: totalDocs,
      termoBuscado: termo,
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
