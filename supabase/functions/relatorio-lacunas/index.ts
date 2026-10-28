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
  {
    id: 'docente_permanente_sem_linha_pesquisa',
    tabela: 'docentes',
    campos: ['linhas_pesquisa'],
    descricao: 'Docente permanente sem linha de pesquisa',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (docente) => {
      const isPermanente =
        String(docente.categoria || '')
          .toLowerCase()
          .trim() === 'permanente'
      if (!isPermanente) return { temLacuna: false }
      const qtdLinhas = Array.isArray(docente.docentes_linhas)
        ? docente.docentes_linhas.length
        : typeof docente.total_linhas === 'number'
          ? docente.total_linhas
          : 0
      const tem = qtdLinhas === 0
      return {
        temLacuna: tem,
        motivo: tem
          ? 'Docente da categoria permanente sem nenhuma linha de pesquisa vinculada'
          : undefined,
      }
    },
  },
  {
    id: 'docente_sem_projeto_pesquisa',
    tabela: 'docentes',
    campos: ['projetos_participantes', 'coordenador_id'],
    descricao: 'Docente sem participação estruturada em projeto',
    severidade: 'atencao',
    grupo: 'Acadêmico',
    avaliar: (docente) => {
      const qtdParticipacoes = Array.isArray(docente.projetos_participantes)
        ? docente.projetos_participantes.length
        : typeof docente.total_participacoes_projetos === 'number'
          ? docente.total_participacoes_projetos
          : 0
      const qtdCoordenacoes = Array.isArray(docente.projetos_coordenados)
        ? docente.projetos_coordenados.length
        : typeof docente.total_projetos_coordenados === 'number'
          ? docente.total_projetos_coordenados
          : 0
      const tem = qtdParticipacoes === 0 && qtdCoordenacoes === 0
      return {
        temLacuna: tem,
        motivo: tem
          ? 'Docente sem nenhuma participação estruturada ou coordenação em projeto de pesquisa'
          : undefined,
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
  {
    id: 'discente_sem_docente_orientador',
    tabela: 'discentes',
    campos: ['docente_orientador_id'],
    descricao: 'Discente sem orientador vinculado',
    severidade: 'critica',
    grupo: 'Acadêmico',
    avaliar: (discente) => {
      const tem =
        discente.docente_orientador_id === null ||
        discente.docente_orientador_id === undefined ||
        Number(discente.docente_orientador_id) <= 0
      return {
        temLacuna: tem,
        motivo: tem ? 'Docente orientador estruturado não vinculado ao discente' : undefined,
      }
    },
  },
  {
    id: 'discente_sem_projeto_pesquisa',
    tabela: 'discentes',
    campos: ['projeto_id'],
    descricao: 'Discente sem projeto de pesquisa vinculado',
    severidade: 'atencao',
    grupo: 'Acadêmico',
    avaliar: (discente) => {
      const qtdProjetosPonte =
        typeof discente.total_projetos_vinculados === 'number'
          ? discente.total_projetos_vinculados
          : Array.isArray(discente.projetos_discentes)
            ? discente.projetos_discentes.length
            : 0

      const temProjetoLegado =
        discente.projeto_id !== null &&
        discente.projeto_id !== undefined &&
        Number(discente.projeto_id) > 0

      const temVinculo = qtdProjetosPonte > 0 || temProjetoLegado
      return {
        temLacuna: !temVinculo,
        motivo: !temVinculo
          ? 'Projeto de pesquisa estruturado não vinculado ao discente'
          : undefined,
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
  {
    id: 'publicacao_jcr_sem_docente_vinculado',
    tabela: 'publicacoes',
    campos: ['fator_impacto_jcr', 'publicacoes_docentes'],
    descricao: 'Publicação JCR ≥ 1,0 sem docente vinculado',
    severidade: 'atencao',
    grupo: 'Produção',
    avaliar: (pub) => {
      const jcrNum =
        pub.fator_impacto_jcr !== null && pub.fator_impacto_jcr !== undefined
          ? Number(pub.fator_impacto_jcr)
          : null
      if (jcrNum === null || isNaN(jcrNum) || jcrNum < 1.0) {
        return { temLacuna: false }
      }
      const qtdDocentes = Array.isArray(pub.publicacoes_docentes)
        ? pub.publicacoes_docentes.length
        : typeof pub.total_docentes_vinculados === 'number'
          ? pub.total_docentes_vinculados
          : 0
      const tem = qtdDocentes === 0
      return {
        temLacuna: tem,
        motivo: tem
          ? `Publicação com JCR ${jcrNum} sem nenhum docente autor vinculado em publicações-docentes`
          : undefined,
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

    // Consultas eficientes em paralelo sobre as tabelas base + tabelas de vínculos estruturados (R4)
    const [
      docentesRes,
      discentesRes,
      publicacoesRes,
      orientacoesRes,
      projetosRes,
      eventosRes,
      mobilidadeRes,
      patentesRes,
      premiacoesRes,
      producaoTecnicaRes,
      docentesLinhasRes,
      projetosParticipantesRes,
      projetosDiscentesRes,
      publicacoesDocentesRes,
    ] = await Promise.all([
      supabase
        .from('docentes')
        .select('id, nome, categoria, scopus_id, openalex_id, id_lattes, indice_h, bolsa_cnpq')
        .order('nome', { ascending: true }),
      supabase
        .from('discentes')
        .select(
          'id, nome, cpf, data_ingresso, status, link_lattes, docente_orientador_id, projeto_id',
        )
        .order('nome', { ascending: true }),
      supabase
        .from('publicacoes')
        .select('id, titulo, autores, periodico, ano, doi, fator_impacto_jcr')
        .order('ano', { ascending: false }),
      supabase.from('orientacoes').select('id, tipo, inicio, fim, status, docente_id, discente_id'),
      supabase
        .from('projetos_pesquisa')
        .select('id, titulo, inicio, fim, financiamento, orgao_fomento, coordenador_id'),
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
      supabase.from('docentes_linhas').select('docente_id, linha_id'),
      supabase.from('projetos_participantes').select('projeto_id, docente_id'),
      supabase.from('projetos_discentes').select('projeto_id, discente_id'),
      supabase.from('publicacoes_docentes').select('publicacao_id, docente_id'),
    ])

    // Verificar se houve erro crítico de leitura em alguma tabela essencial
    const erros = [
      docentesRes.error,
      discentesRes.error,
      publicacoesRes.error,
      orientacoesRes.error,
      projetosRes.error,
      eventosRes.error,
      mobilidadeRes.error,
      patentesRes.error,
      premiacoesRes.error,
      producaoTecnicaRes.error,
      docentesLinhasRes.error,
      projetosParticipantesRes.error,
      projetosDiscentesRes.error,
      publicacoesDocentesRes.error,
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

    // Enriquecimento com contagens estruturadas (R4)
    const mapaDocentesLinhas = new Map<number, number>()
    for (const dl of docentesLinhasRes.data || []) {
      mapaDocentesLinhas.set(dl.docente_id, (mapaDocentesLinhas.get(dl.docente_id) || 0) + 1)
    }

    const mapaDocentesParticipacoes = new Map<number, number>()
    for (const pp of projetosParticipantesRes.data || []) {
      mapaDocentesParticipacoes.set(
        pp.docente_id,
        (mapaDocentesParticipacoes.get(pp.docente_id) || 0) + 1,
      )
    }

    const mapaDocentesCoordenacoes = new Map<number, number>()
    for (const pr of projetosRes.data || []) {
      if (pr.coordenador_id) {
        mapaDocentesCoordenacoes.set(
          pr.coordenador_id,
          (mapaDocentesCoordenacoes.get(pr.coordenador_id) || 0) + 1,
        )
      }
    }

    const mapaPubsDocentes = new Map<number, number>()
    for (const pd of publicacoesDocentesRes.data || []) {
      mapaPubsDocentes.set(pd.publicacao_id, (mapaPubsDocentes.get(pd.publicacao_id) || 0) + 1)
    }

    const mapaDiscProjetos = new Map<number, number>()
    for (const pd of projetosDiscentesRes.data || []) {
      mapaDiscProjetos.set(pd.discente_id, (mapaDiscProjetos.get(pd.discente_id) || 0) + 1)
    }

    const discentesEnriquecidos = (discentesRes.data || []).map((d: any) => ({
      ...d,
      total_projetos_vinculados: mapaDiscProjetos.get(d.id) || 0,
    }))

    const docentesEnriquecidos = (docentesRes.data || []).map((d: any) => ({
      ...d,
      total_linhas: mapaDocentesLinhas.get(d.id) || 0,
      total_participacoes_projetos: mapaDocentesParticipacoes.get(d.id) || 0,
      total_projetos_coordenados: mapaDocentesCoordenacoes.get(d.id) || 0,
    }))

    const publicacoesEnriquecidas = (publicacoesRes.data || []).map((p: any) => ({
      ...p,
      total_docentes_vinculados: mapaPubsDocentes.get(p.id) || 0,
    }))

    const avalDocentes = avaliarColecaoEdge(docentesEnriquecidos, REGRAS_DOCENTES_EDGE)
    const avalDiscentes = avaliarColecaoEdge(discentesEnriquecidos, REGRAS_DISCENTES_EDGE)
    const avalPublicacoes = avaliarColecaoEdge(publicacoesEnriquecidas, REGRAS_PUBLICACOES_EDGE)
    const avalOrientacoes = avaliarColecaoEdge(orientacoesRes.data || [], REGRAS_ORIENTACOES_EDGE)
    const avalProjetos = avaliarColecaoEdge(projetosRes.data || [], REGRAS_PROJETOS_PESQUISA_EDGE)
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
