import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

export type SeveridadeLacuna = 'critica' | 'atencao'
export type TabelaAlvoLacuna = 'docentes' | 'discentes'

export interface ItemLacunaRegistro {
  id: number
  nome: string
  motivo: string
}

export interface RegraLacunaDef<T = any> {
  id: string
  tabela: TabelaAlvoLacuna
  campos: string[]
  descricao: string
  severidade: SeveridadeLacuna
  grupo: string
  avaliar: (registro: T) => { temLacuna: boolean; motivo?: string }
}

function textoVazio(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') return val.trim().length === 0
  return false
}

export const REGRAS_DOCENTES_EDGE: RegraLacunaDef[] = [
  {
    id: 'docente_sem_scopus_id',
    tabela: 'docentes',
    campos: ['scopus_id'],
    descricao: 'Docente sem Scopus ID',
    severidade: 'critica',
    grupo: 'Identificadores e Métricas',
    avaliar: (docente) => {
      const tem = textoVazio(docente.scopus_id)
      return {
        temLacuna: tem,
        motivo: tem ? 'Scopus ID não informado' : undefined,
      }
    },
  },
  {
    id: 'docente_sem_openalex_id',
    tabela: 'docentes',
    campos: ['openalex_id'],
    descricao: 'Docente sem OpenAlex ID',
    severidade: 'atencao',
    grupo: 'Identificadores e Métricas',
    avaliar: (docente) => {
      const tem = textoVazio(docente.openalex_id)
      return {
        temLacuna: tem,
        motivo: tem ? 'OpenAlex ID não informado' : undefined,
      }
    },
  },
  {
    id: 'docente_sem_id_lattes',
    tabela: 'docentes',
    campos: ['id_lattes'],
    descricao: 'Docente sem ID Lattes',
    severidade: 'critica',
    grupo: 'Identificadores e Métricas',
    avaliar: (docente) => {
      const tem = textoVazio(docente.id_lattes)
      return {
        temLacuna: tem,
        motivo: tem ? 'ID Lattes (16 dígitos) não cadastrado' : undefined,
      }
    },
  },
  {
    id: 'docente_indice_h_ausente_ou_zero',
    tabela: 'docentes',
    campos: ['indice_h'],
    descricao: 'Docente com índice-h ausente ou zero',
    severidade: 'atencao',
    grupo: 'Identificadores e Métricas',
    avaliar: (docente) => {
      const h = docente.indice_h
      const tem = h === null || h === undefined || Number(h) <= 0 || isNaN(Number(h))
      return {
        temLacuna: tem,
        motivo: tem ? 'Índice-h não informado ou igual a 0' : undefined,
      }
    },
  },
  {
    id: 'docente_sem_bolsa_cnpq',
    tabela: 'docentes',
    campos: ['bolsa_cnpq'],
    descricao: 'Docente sem bolsa CNPq informada',
    severidade: 'atencao',
    grupo: 'Fomento e Bolsas',
    avaliar: (docente) => {
      const tem = textoVazio(docente.bolsa_cnpq)
      return {
        temLacuna: tem,
        motivo: tem ? 'Bolsa de produtividade CNPq não informada' : undefined,
      }
    },
  },
]

export const REGRAS_DISCENTES_EDGE: RegraLacunaDef[] = [
  {
    id: 'discente_sem_cpf',
    tabela: 'discentes',
    campos: ['cpf'],
    descricao: 'Discente sem CPF',
    severidade: 'critica',
    grupo: 'Identificação Cadastral',
    avaliar: (discente) => {
      const tem = textoVazio(discente.cpf)
      return {
        temLacuna: tem,
        motivo: tem ? 'CPF não informado' : undefined,
      }
    },
  },
  {
    id: 'discente_sem_data_ingresso',
    tabela: 'discentes',
    campos: ['data_ingresso'],
    descricao: 'Discente sem data de ingresso',
    severidade: 'atencao',
    grupo: 'Identificação Cadastral',
    avaliar: (discente) => {
      const tem = textoVazio(discente.data_ingresso)
      return {
        temLacuna: tem,
        motivo: tem ? 'Data ou ano de ingresso não informado' : undefined,
      }
    },
  },
  {
    id: 'discente_sem_link_lattes',
    tabela: 'discentes',
    campos: ['link_lattes'],
    descricao: 'Discente sem link Lattes',
    severidade: 'atencao',
    grupo: 'Identificação Cadastral',
    avaliar: (discente) => {
      const tem = textoVazio(discente.link_lattes)
      return {
        temLacuna: tem,
        motivo: tem ? 'Link do currículo Lattes não informado' : undefined,
      }
    },
  },
  {
    id: 'discente_sem_status',
    tabela: 'discentes',
    campos: ['status'],
    descricao: 'Discente sem status',
    severidade: 'critica',
    grupo: 'Situação Acadêmica',
    avaliar: (discente) => {
      const tem = textoVazio(discente.status)
      return {
        temLacuna: tem,
        motivo: tem ? 'Status acadêmico não definido' : undefined,
      }
    },
  },
]

function avaliarColecaoEdge<T extends { id: number; nome: string }>(
  registros: T[],
  regras: RegraLacunaDef<T>[],
) {
  const resumo = []
  const lacunas = []
  const total = registros.length

  for (const regra of regras) {
    const pendentes: ItemLacunaRegistro[] = []
    for (const reg of registros) {
      const resultado = regra.avaliar(reg)
      if (resultado.temLacuna) {
        pendentes.push({
          id: reg.id,
          nome: reg.nome || `ID ${reg.id}`,
          motivo: resultado.motivo || regra.descricao,
        })
      }
    }

    resumo.push({
      grupo: regra.grupo,
      tabela: regra.tabela,
      regra_id: regra.id,
      descricao: regra.descricao,
      severidade: regra.severidade,
      total_registros: total,
      total_lacunas: pendentes.length,
    })

    lacunas.push({
      regra_id: regra.id,
      severidade: regra.severidade,
      grupo: regra.grupo,
      registros: pendentes,
    })
  }

  return { resumo, lacunas }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Variáveis de ambiente do Supabase não configuradas na Edge Function.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // Usamos o cabeçalho Authorization da requisição se fornecido, ou a service key
    const authHeader = req.headers.get('Authorization')
    const clientKey = supabaseServiceKey || supabaseAnonKey!

    const supabase = createClient(supabaseUrl, clientKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
    })

    // Consultas eficientes em paralelo: exatamente 2 queries para ler docentes e discentes
    const [docentesRes, discentesRes] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, scopus_id, openalex_id, id_lattes, indice_h, bolsa_cnpq')
        .order('nome', { ascending: true }),
      supabase
        .from('discentes')
        .select('id, nome, cpf, data_ingresso, status, link_lattes')
        .order('nome', { ascending: true }),
    ])

    if (docentesRes.error) {
      console.error('[relatorio-lacunas] erro ao consultar docentes:', docentesRes.error)
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: `Erro ao consultar docentes: ${docentesRes.error.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    if (discentesRes.error) {
      console.error('[relatorio-lacunas] erro ao consultar discentes:', discentesRes.error)
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: `Erro ao consultar discentes: ${discentesRes.error.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const docentes = docentesRes.data || []
    const discentes = discentesRes.data || []

    const avalDocentes = avaliarColecaoEdge(docentes, REGRAS_DOCENTES_EDGE)
    const avalDiscentes = avaliarColecaoEdge(discentes, REGRAS_DISCENTES_EDGE)

    const respostaConsolidada = {
      gerado_em: new Date().toISOString(),
      resumo: [...avalDocentes.resumo, ...avalDiscentes.resumo],
      lacunas: [...avalDocentes.lacunas, ...avalDiscentes.lacunas],
    }

    return new Response(JSON.stringify(respostaConsolidada), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    console.error('[relatorio-lacunas] erro inesperado:', err)
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: err?.message || 'Erro inesperado ao gerar relatório de lacunas.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})
