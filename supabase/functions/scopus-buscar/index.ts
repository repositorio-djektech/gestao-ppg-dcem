import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  montarScopusQuery,
  mapearEntradasScopus,
  type ScopusRespostaBusca,
} from './scopus-parser.ts'

Deno.serve(async (req: Request) => {
  // Tratamento de preflight CORS
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
    // Para agregação de autores, buscamos mais documentos na Scopus Search (ex: até 25)
    const limite = Math.min(Math.max(1, Number(body.limite) || 15), 25)

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
        status: 200, // Retorna 200 com payload gracioso para o frontend
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Usar o endpoint Scopus Search (content/search/scopus), suportado no entitlement básico
    const query = montarScopusQuery(termo, filtroAfiliacao)
    const scopusUrl = new URL('https://api.elsevier.com/content/search/scopus')
    scopusUrl.searchParams.set('query', query)
    scopusUrl.searchParams.set('count', String(limite))
    scopusUrl.searchParams.set('view', 'STANDARD')

    // Grava telemetria segura na tabela public.scopus_val_log se ela existir
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/rest/v1/scopus_val_log`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            stage: 'before_elsevier_fetch',
            data: { termo, query, hasApiKey: Boolean(apiKey) },
          }),
        })
      }
    } catch (_) {
      // Ignora falhas no log
    }

    // Timeout com AbortController de 12 segundos
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)

    let response: Response
    try {
      response = await fetch(scopusUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'X-ELS-APIKey': apiKey,
        },
      })
    } catch (fetchErr: any) {
      clearTimeout(timer)
      const isTimeout = fetchErr?.name === 'AbortError'
      const resTimeout: ScopusRespostaBusca = {
        sucesso: false,
        candidatos: [],
        total: 0,
        termoBuscado: termo,
        mensagemErro: isTimeout
          ? 'Tempo limite excedido ao consultar o serviço Scopus da Elsevier. Tente novamente.'
          : 'Não foi possível conectar ao serviço Elsevier Scopus. Verifique a conexão.',
      }
      return new Response(JSON.stringify(resTimeout), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } finally {
      clearTimeout(timer)
    }

    // Tratamento de códigos de erro amigáveis em português
    if (!response.ok) {
      let mensagemAmigavel = `Falha na consulta Scopus (status ${response.status}).`
      if (response.status === 401) {
        mensagemAmigavel =
          'Chave da API Scopus inválida ou não autorizada. Verifique a configuração da chave no painel.'
      } else if (response.status === 403) {
        mensagemAmigavel =
          'Acesso não autorizado ao recurso Scopus solicitado. O plano básico da chave pode não ter acesso a este endpoint.'
      } else if (response.status === 429) {
        mensagemAmigavel =
          'Limite de requisições da API Scopus atingido (quota semanal excedida). Aguarde a renovação da cota.'
      } else if (response.status >= 500) {
        mensagemAmigavel =
          'Os servidores da Elsevier Scopus estão temporariamente indisponíveis. Tente novamente mais tarde.'
      }

      // Grava erro HTTP em scopus_val_log
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (supabaseUrl && serviceKey) {
          const errText = await response.text().catch(() => '')
          await fetch(`${supabaseUrl}/rest/v1/scopus_val_log`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              stage: 'http_error',
              data: {
                status: response.status,
                mensagemAmigavel,
                errBodySnippet: errText.slice(0, 500),
              },
            }),
          })
        }
      } catch (_) {}

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

    const data = await response.json()
    const searchResults = data?.['search-results']
    const entries = searchResults?.entry || []
    const totalDocsRaw = searchResults?.['opensearch:totalResults']
    const totalDocs = Number(totalDocsRaw) || (Array.isArray(entries) ? entries.length : 0)

    // Agrupa e extrai autores únicos dos documentos retornados
    const candidatos = mapearEntradasScopus(entries, termo)

    // Grava telemetria de sucesso na tabela public.scopus_val_log
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/rest/v1/scopus_val_log`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            stage: 'success',
            data: {
              status: response.status,
              totalDocs,
              entriesCount: Array.isArray(entries) ? entries.length : 0,
              candidatosCount: candidatos.length,
              candidatos: candidatos.map((c) => ({
                scopus_id: c.scopus_id,
                nome: c.nome,
                instituicao: c.instituicao,
                document_count: c.document_count,
                cited_by_count: c.cited_by_count,
              })),
            },
          }),
        })
      }
    } catch (_) {
      // Ignora falhas de log
    }

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
