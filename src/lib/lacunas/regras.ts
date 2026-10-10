import type {
  Docente,
  Discente,
  Publicacao,
  Orientacao,
  ProjetoPesquisa,
  Banca,
  Evento,
  Mobilidade,
  Patente,
  Premiacao,
  ProducaoTecnica,
} from '@/types/database'
import type {
  RegraLacuna,
  ResumoRegraLacuna,
  DetalheRegraLacuna,
  RelatorioLacunasResposta,
} from './types'

export function textoVazio(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') return val.trim().length === 0
  return false
}

function anoInvalido(val: unknown): boolean {
  if (val === null || val === undefined) return true
  const num = Number(val)
  return isNaN(num) || num <= 0
}

export const REGRAS_DOCENTES: RegraLacuna<Docente>[] = [
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

export const REGRAS_DISCENTES: RegraLacuna<Discente>[] = [
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

// 1. PUBLICAÇÕES
export const REGRAS_PUBLICACOES: RegraLacuna<Publicacao>[] = [
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

// 2. ORIENTAÇÕES
export const REGRAS_ORIENTACOES: RegraLacuna<Orientacao>[] = [
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

// 3. PROJETOS DE PESQUISA
export const REGRAS_PROJETOS_PESQUISA: RegraLacuna<ProjetoPesquisa>[] = [
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

// 4. BANCAS
export const REGRAS_BANCAS: RegraLacuna<Banca>[] = [
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

// 5. EVENTOS
export const REGRAS_EVENTOS: RegraLacuna<Evento>[] = [
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

// 6. MOBILIDADE
export const REGRAS_MOBILIDADE: RegraLacuna<Mobilidade>[] = [
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

// 7. PATENTES
export const REGRAS_PATENTES: RegraLacuna<Patente>[] = [
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

// 8. PREMIAÇÕES
export const REGRAS_PREMIACOES: RegraLacuna<Premiacao>[] = [
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

// 9. PRODUÇÃO TÉCNICA
export const REGRAS_PRODUCAO_TECNICA: RegraLacuna<ProducaoTecnica>[] = [
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

export const TODAS_AS_REGRAS = [
  ...REGRAS_DOCENTES,
  ...REGRAS_DISCENTES,
  ...REGRAS_PUBLICACOES,
  ...REGRAS_ORIENTACOES,
  ...REGRAS_PROJETOS_PESQUISA,
  ...REGRAS_BANCAS,
  ...REGRAS_EVENTOS,
  ...REGRAS_MOBILIDADE,
  ...REGRAS_PATENTES,
  ...REGRAS_PREMIACOES,
  ...REGRAS_PRODUCAO_TECNICA,
]

export function extrairNomeRegistro(registro: any): string {
  if (!registro) return 'Registro'
  if (registro.nome) return String(registro.nome)
  if (registro.titulo) return String(registro.titulo)
  if (registro.titulo_trabalho) return String(registro.titulo_trabalho)
  if (registro.evento) return String(registro.evento)
  if (registro.tipo && registro.inicio) return `${registro.tipo} (${registro.inicio})`
  return `ID ${registro.id}`
}

export function avaliarColecao<T extends { id: number; [key: string]: any }>(
  registros: T[],
  regras: RegraLacuna<T>[],
): {
  resumo: ResumoRegraLacuna[]
  lacunas: DetalheRegraLacuna[]
} {
  const resumo: ResumoRegraLacuna[] = []
  const lacunas: DetalheRegraLacuna[] = []
  const total = registros.length

  for (const regra of regras) {
    const pendentes = []
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

export interface DadosConsolidacaoLacunas {
  docentes?: Docente[]
  discentes?: Discente[]
  publicacoes?: Publicacao[]
  orientacoes?: Orientacao[]
  projetos_pesquisa?: ProjetoPesquisa[]
  bancas?: Banca[]
  eventos?: Evento[]
  mobilidade_docente?: Mobilidade[]
  patentes?: Patente[]
  premiacoes?: Premiacao[]
  producao_tecnica?: ProducaoTecnica[]
  dataGeracao?: string
}

export function consolidarRelatorioLacunas(
  params: DadosConsolidacaoLacunas,
): RelatorioLacunasResposta {
  const {
    docentes = [],
    discentes = [],
    publicacoes = [],
    orientacoes = [],
    projetos_pesquisa = [],
    bancas = [],
    eventos = [],
    mobilidade_docente = [],
    patentes = [],
    premiacoes = [],
    producao_tecnica = [],
    dataGeracao,
  } = params

  const resDocentes = avaliarColecao(docentes, REGRAS_DOCENTES)
  const resDiscentes = avaliarColecao(discentes, REGRAS_DISCENTES)
  const resPublicacoes = avaliarColecao(publicacoes, REGRAS_PUBLICACOES)
  const resOrientacoes = avaliarColecao(orientacoes, REGRAS_ORIENTACOES)
  const resProjetos = avaliarColecao(projetos_pesquisa, REGRAS_PROJETOS_PESQUISA)
  const resBancas = avaliarColecao(bancas, REGRAS_BANCAS)
  const resEventos = avaliarColecao(eventos, REGRAS_EVENTOS)
  const resMobilidade = avaliarColecao(mobilidade_docente, REGRAS_MOBILIDADE)
  const resPatentes = avaliarColecao(patentes, REGRAS_PATENTES)
  const resPremiacoes = avaliarColecao(premiacoes, REGRAS_PREMIACOES)
  const resProducaoTecnica = avaliarColecao(producao_tecnica, REGRAS_PRODUCAO_TECNICA)

  return {
    gerado_em: dataGeracao || new Date().toISOString(),
    resumo: [
      ...resDocentes.resumo,
      ...resDiscentes.resumo,
      ...resPublicacoes.resumo,
      ...resOrientacoes.resumo,
      ...resProjetos.resumo,
      ...resBancas.resumo,
      ...resEventos.resumo,
      ...resMobilidade.resumo,
      ...resPatentes.resumo,
      ...resPremiacoes.resumo,
      ...resProducaoTecnica.resumo,
    ],
    lacunas: [
      ...resDocentes.lacunas,
      ...resDiscentes.lacunas,
      ...resPublicacoes.lacunas,
      ...resOrientacoes.lacunas,
      ...resProjetos.lacunas,
      ...resBancas.lacunas,
      ...resEventos.lacunas,
      ...resMobilidade.lacunas,
      ...resPatentes.lacunas,
      ...resPremiacoes.lacunas,
      ...resProducaoTecnica.lacunas,
    ],
  }
}
