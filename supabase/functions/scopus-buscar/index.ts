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
    const limite = Math.min(Math.max(1, Number(body.limite) || 10), 25)

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

    const query = montarScopusQuery(termo, filtroAfiliacao)
    const scopusUrl = new URL('https://api.elsevier.com/content/search/author')
    scopusUrl.searchParams.set('query', query)
    scopusUrl.searchParams.set('count', String(limite))

    // Timeout com AbortController de 10 segundos
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

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
          'Limite de requisições semanais da API Scopus atingido (quota excedida). Aguarde a renovação da cota.'
      } else if (response.status >= 500) {
        mensagemAmigavel =
          'Os servidores da Elsevier Scopus estão temporariamente indisponíveis. Tente novamente mais tarde.'
      }

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
    const totalRaw = searchResults?.['opensearch:totalResults']
    const totalCount = Number(totalRaw) || (Array.isArray(entries) ? entries.length : 0)

    const candidatos = mapearEntradasScopus(entries)

    const resSucesso: ScopusRespostaBusca = {
      sucesso: true,
      candidatos,
      total: totalCount,
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
