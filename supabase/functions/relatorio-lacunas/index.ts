import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

export type SeveridadeLacuna = 'critica' | 'atencao'
export type TabelaAlvoLacuna =
  | 'docentes'
  | 'discentes'
  | 'publicacoes'
  | 'orientacoes'
  | 'projetos_pesquisa'
  | 'bancas'
  | 'eventos'
  | 'mobilidade_docente'
  | 'patentes'
  | 'premiacoes'
  | 'producao_tecnica'

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

function anoInvalido(val: unknown): boolean {
  if (val === null || val === undefined) return true
  const num = Number(val)
  return isNaN(num) || num <= 0
}

function extrairNomeRegistro(registro: any): string {
  if (!registro) return 'Registro'
  if (registro.nome) return String(registro.nome)
  if (registro.titulo) return String(registro.titulo)
  if (registro.titulo_trabalho) return String(registro.titulo_trabalho)
  if (registro.evento) return String(registro.evento)
  if (registro.tipo && registro.inicio) return `${registro.tipo} (${registro.inicio})`
  return `ID ${registro.id}`
}

// 1. DOCENTES (5 regras)
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

// 2. DISCENTES (4 regras)
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

// 3. PUBLICAÇÕES (3 regras)
export const REGRAS_PUBLICACOES_EDGE: RegraLacunaDef[] = [
  {
    id: 'publicacao_sem_ano',
    tabela: 'publicacoes',
    campos: ['ano'],
    descricao: 'Publicação sem ano',
    severidade: 'critica',
    grupo: 'Produção',
    avaliar: (pub) => {
      const tem = anoInvalido(pub.ano)
      return {
        temLacuna: tem,
        motivo: tem ? 'Ano de publicação não informado ou inválido' : undefined,
      }
    },
  },
  {
    id: 'publicacao_sem_doi',
    tabela: 'publicacoes',
    campos: ['doi'],
    descricao: 'Publicação sem DOI',
    severidade: 'atencao',
    grupo: 'Produção',
    avaliar: (pub) => {
      const tem = textoVazio(pub.doi)
      return {
        temLacuna: tem,
        motivo: tem ? 'DOI da publicação não informado' : undefined,
      }
    },
  },
  {
    id: 'publicacao_sem_periodico',
    tabela: 'publicacoes',
    campos: ['periodico'],
    descricao: 'Publicação sem periódico',
    severidade: 'atencao',
    grupo: 'Produção',
    avaliar: (pub) => {
      const tem = textoVazio(pub.periodico)
      return {
        temLacuna: tem,
        motivo: tem ? 'Nome do periódico/revista não informado' : undefined,
      }
    },
  },
]

// 4. ORIENTAÇÕES (3 regras)
export const REGRAS_ORIENTACOES_EDGE: RegraLacunaDef[] = [
  {
    id: 'orientacao_sem_docente',
    tabela: 'orientacoes',
    campos: ['docente_id'],
    descricao: 'Orientação sem docente vinculado',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (ori) => {
      const tem =
        ori.docente_id === null || ori.docente_id === undefined || Number(ori.docente_id) <= 0
      return {
        temLacuna: tem,
        motivo: tem ? 'Docente orientador não vinculado' : undefined,
      }
    },
  },
  {
    id: 'orientacao_sem_discente',
    tabela: 'orientacoes',
    campos: ['discente_id'],
    descricao: 'Orientação sem discente vinculado',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (ori) => {
      const tem =
        ori.discente_id === null || ori.discente_id === undefined || Number(ori.discente_id) <= 0
      return {
        temLacuna: tem,
        motivo: tem ? 'Discente orientado não vinculado' : undefined,
      }
    },
  },
  {
    id: 'orientacao_sem_periodo',
    tabela: 'orientacoes',
    campos: ['inicio'],
    descricao: 'Orientação sem período de início',
    severidade: 'atencao',
    grupo: 'Acadêmico',
    avaliar: (ori) => {
      const tem = textoVazio(ori.inicio)
      return {
        temLacuna: tem,
        motivo: tem ? 'Data ou ano de início da orientação não informado' : undefined,
      }
    },
  },
]

// 5. PROJETOS DE PESQUISA (3 regras)
export const REGRAS_PROJETOS_PESQUISA_EDGE: RegraLacunaDef[] = [
  {
    id: 'projeto_sem_coordenador',
    tabela: 'projetos_pesquisa',
    campos: ['coordenador_id'],
    descricao: 'Projeto sem coordenador vinculado',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (proj) => {
      const tem =
        proj.coordenador_id === null ||
        proj.coordenador_id === undefined ||
        Number(proj.coordenador_id) <= 0
      return {
        temLacuna: tem,
        motivo: tem ? 'Docente coordenador do projeto não vinculado' : undefined,
      }
    },
  },
  {
    id: 'projeto_sem_periodo',
    tabela: 'projetos_pesquisa',
    campos: ['inicio'],
    descricao: 'Projeto sem período de início',
    severidade: 'atencao',
    grupo: 'Acadêmico',
    avaliar: (proj) => {
      const tem = textoVazio(proj.inicio)
      return {
        temLacuna: tem,
        motivo: tem ? 'Data ou ano de início do projeto não informado' : undefined,
      }
    },
  },
  {
    id: 'projeto_financiado_sem_orgao_fomento',
    tabela: 'projetos_pesquisa',
    campos: ['financiamento', 'orgao_fomento'],
    descricao: 'Projeto financiado sem órgão de fomento',
    severidade: 'atencao',
    grupo: 'Acadêmico',
    avaliar: (proj) => {
      const tem = Boolean(proj.financiamento) && textoVazio(proj.orgao_fomento)
      return {
        temLacuna: tem,
        motivo: tem
          ? 'Projeto marcado como financiado mas sem órgão de fomento informado'
          : undefined,
      }
    },
  },
]

// 6. BANCAS (2 regras)
export const REGRAS_BANCAS_EDGE: RegraLacunaDef[] = [
  {
    id: 'banca_sem_data',
    tabela: 'bancas',
    campos: ['data'],
    descricao: 'Banca sem data informada',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (banca) => {
      const tem = textoVazio(banca.data)
      return {
        temLacuna: tem,
        motivo: tem ? 'Data de realização da banca não informada' : undefined,
      }
    },
  },
  {
    id: 'banca_sem_membros',
    tabela: 'bancas',
    campos: ['membros'],
    descricao: 'Banca sem docentes/membros avaliadores',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (banca) => {
      const tem = textoVazio(banca.membros)
      return {
        temLacuna: tem,
        motivo: tem ? 'Membros da banca examinadora não informados' : undefined,
      }
    },
  },
]

// 7. EVENTOS (2 regras)
export const REGRAS_EVENTOS_EDGE: RegraLacunaDef[] = [
  {
    id: 'evento_sem_docente',
    tabela: 'eventos',
    campos: ['docente'],
    descricao: 'Evento sem vinculação de docente',
    severidade: 'critica',
    grupo: 'Difusão',
    avaliar: (ev) => {
      const tem = textoVazio(ev.docente)
      return {
        temLacuna: tem,
        motivo: tem ? 'Docente participante não informado no evento' : undefined,
      }
    },
  },
  {
    id: 'evento_sem_data',
    tabela: 'eventos',
    campos: ['local_data'],
    descricao: 'Evento sem local/data informada',
    severidade: 'atencao',
    grupo: 'Difusão',
    avaliar: (ev) => {
      const tem = textoVazio(ev.local_data)
      return {
        temLacuna: tem,
        motivo: tem ? 'Local ou data do evento não preenchido' : undefined,
      }
    },
  },
]

// 8. MOBILIDADE (2 regras)
export const REGRAS_MOBILIDADE_EDGE: RegraLacunaDef[] = [
  {
    id: 'mobilidade_sem_pessoa',
    tabela: 'mobilidade_docente',
    campos: ['nome'],
    descricao: 'Mobilidade sem docente/discente vinculado',
    severidade: 'critica',
    grupo: 'Difusão',
    avaliar: (mob) => {
      const tem = textoVazio(mob.nome)
      return {
        temLacuna: tem,
        motivo: tem ? 'Nome do docente ou discente em mobilidade não informado' : undefined,
      }
    },
  },
  {
    id: 'mobilidade_sem_periodo',
    tabela: 'mobilidade_docente',
    campos: ['periodo'],
    descricao: 'Mobilidade sem período',
    severidade: 'atencao',
    grupo: 'Difusão',
    avaliar: (mob) => {
      const tem = textoVazio(mob.periodo)
      return {
        temLacuna: tem,
        motivo: tem ? 'Período da mobilidade acadêmica não informado' : undefined,
      }
    },
  },
]

// 9. PATENTES (2 regras)
export const REGRAS_PATENTES_EDGE: RegraLacunaDef[] = [
  {
    id: 'patente_sem_autores',
    tabela: 'patentes',
    campos: ['autores'],
    descricao: 'Patente sem inventores/vinculação',
    severidade: 'critica',
    grupo: 'Produção',
    avaliar: (pat) => {
      const tem = textoVazio(pat.autores)
      return {
        temLacuna: tem,
        motivo: tem ? 'Inventores/autores da patente não cadastrados' : undefined,
      }
    },
  },
  {
    id: 'patente_sem_deposito',
    tabela: 'patentes',
    campos: ['inpi'],
    descricao: 'Patente sem número de depósito (INPI)',
    severidade: 'atencao',
    grupo: 'Produção',
    avaliar: (pat) => {
      const tem = textoVazio(pat.inpi)
      return {
        temLacuna: tem,
        motivo: tem ? 'Número de processo/depósito no INPI não informado' : undefined,
      }
    },
  },
]

// 10. PREMIAÇÕES (2 regras)
export const REGRAS_PREMIACOES_EDGE: RegraLacunaDef[] = [
  {
    id: 'premiacao_sem_premiado',
    tabela: 'premiacoes',
    campos: ['nome_premiado'],
    descricao: 'Premiação sem premiado vinculado',
    severidade: 'critica',
    grupo: 'Difusão',
    avaliar: (prem) => {
      const tem = textoVazio(prem.nome_premiado)
      return {
        temLacuna: tem,
        motivo: tem ? 'Nome do docente ou discente premiado não informado' : undefined,
      }
    },
  },
  {
    id: 'premiacao_sem_ano',
    tabela: 'premiacoes',
    campos: ['ano'],
    descricao: 'Premiação sem ano',
    severidade: 'atencao',
    grupo: 'Difusão',
    avaliar: (prem) => {
      const tem = anoInvalido(prem.ano)
      return {
        temLacuna: tem,
        motivo: tem ? 'Ano da concessão do prêmio não informado ou inválido' : undefined,
      }
    },
  },
]

// 11. PRODUÇÃO TÉCNICA (1 regra)
export const REGRAS_PRODUCAO_TECNICA_EDGE: RegraLacunaDef[] = [
  {
    id: 'producao_tecnica_sem_autores',
    tabela: 'producao_tecnica',
    campos: ['autores'],
    descricao: 'Produção técnica sem autores vinculados',
    severidade: 'critica',
    grupo: 'Produção',
    avaliar: (pt) => {
      const tem = textoVazio(pt.autores)
      return {
        temLacuna: tem,
        motivo: tem ? 'Autores/desenvolvedores da produção técnica não informados' : undefined,
      }
    },
  },
]

function avaliarColecaoEdge<T extends { id: number; [key: string]: any }>(
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
          nome: extrairNomeRegistro(reg),
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

    // Consultas eficientes em paralelo sobre as 11 tabelas
    const [
      docentesRes,
      discentesRes,
      publicacoesRes,
      orientacoesRes,
      projetosRes,
      bancasRes,
      eventosRes,
      mobilidadeRes,
      patentesRes,
      premiacoesRes,
      producaoTecnicaRes,
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, scopus_id, openalex_id, id_lattes, indice_h, bolsa_cnpq')
        .order('nome', { ascending: true }),
      supabase
        .from('discentes')
        .select('id, nome, cpf, data_ingresso, status, link_lattes')
        .order('nome', { ascending: true }),
      supabase
        .from('publicacoes')
        .select('id, titulo, autores, periodico, ano, doi')
        .order('ano', { ascending: false }),
      supabase.from('orientacoes').select('id, tipo, inicio, fim, status, docente_id, discente_id'),
      supabase
        .from('projetos_pesquisa')
        .select('id, titulo, inicio, fim, financiamento, orgao_fomento, coordenador_id'),
      supabase.from('bancas').select('id, titulo_trabalho, data, membros, tipo, discente_id'),
      supabase.from('eventos').select('id, docente, evento, local_data, papel'),
      supabase
        .from('mobilidade_docente')
        .select('id, tipo, nome, instituicao, periodo, modalidade'),
      supabase.from('patentes').select('id, titulo, status, autores, inpi'),
      supabase
        .from('premiacoes')
        .select('id, titulo, ano, nome_premiado, instituicao')
        .order('ano', { ascending: false }),
      supabase
        .from('producao_tecnica')
        .select('id, titulo, ano, autores, tipo')
        .order('ano', { ascending: false }),
    ])

    // Verificar se houve erro crítico de leitura em alguma tabela essencial
    const erros = [
      docentesRes.error,
      discentesRes.error,
      publicacoesRes.error,
      orientacoesRes.error,
      projetosRes.error,
      bancasRes.error,
      eventosRes.error,
      mobilidadeRes.error,
      patentesRes.error,
      premiacoesRes.error,
      producaoTecnicaRes.error,
    ].filter(Boolean)

    if (erros.length > 0) {
      console.error('[relatorio-lacunas] erro ao consultar tabelas:', erros[0])
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: `Erro ao consultar tabelas: ${erros[0]?.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const avalDocentes = avaliarColecaoEdge(docentesRes.data || [], REGRAS_DOCENTES_EDGE)
    const avalDiscentes = avaliarColecaoEdge(discentesRes.data || [], REGRAS_DISCENTES_EDGE)
    const avalPublicacoes = avaliarColecaoEdge(publicacoesRes.data || [], REGRAS_PUBLICACOES_EDGE)
    const avalOrientacoes = avaliarColecaoEdge(orientacoesRes.data || [], REGRAS_ORIENTACOES_EDGE)
    const avalProjetos = avaliarColecaoEdge(projetosRes.data || [], REGRAS_PROJETOS_PESQUISA_EDGE)
    const avalBancas = avaliarColecaoEdge(bancasRes.data || [], REGRAS_BANCAS_EDGE)
    const avalEventos = avaliarColecaoEdge(eventosRes.data || [], REGRAS_EVENTOS_EDGE)
    const avalMobilidade = avaliarColecaoEdge(mobilidadeRes.data || [], REGRAS_MOBILIDADE_EDGE)
    const avalPatentes = avaliarColecaoEdge(patentesRes.data || [], REGRAS_PATENTES_EDGE)
    const avalPremiacoes = avaliarColecaoEdge(premiacoesRes.data || [], REGRAS_PREMIACOES_EDGE)
    const avalProducaoTecnica = avaliarColecaoEdge(
      producaoTecnicaRes.data || [],
      REGRAS_PRODUCAO_TECNICA_EDGE,
    )

    const respostaConsolidada = {
      gerado_em: new Date().toISOString(),
      resumo: [
        ...avalDocentes.resumo,
        ...avalDiscentes.resumo,
        ...avalPublicacoes.resumo,
        ...avalOrientacoes.resumo,
        ...avalProjetos.resumo,
        ...avalBancas.resumo,
        ...avalEventos.resumo,
        ...avalMobilidade.resumo,
        ...avalPatentes.resumo,
        ...avalPremiacoes.resumo,
        ...avalProducaoTecnica.resumo,
      ],
      lacunas: [
        ...avalDocentes.lacunas,
        ...avalDiscentes.lacunas,
        ...avalPublicacoes.lacunas,
        ...avalOrientacoes.lacunas,
        ...avalProjetos.lacunas,
        ...avalBancas.lacunas,
        ...avalEventos.lacunas,
        ...avalMobilidade.lacunas,
        ...avalPatentes.lacunas,
        ...avalPremiacoes.lacunas,
        ...avalProducaoTecnica.lacunas,
      ],
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
