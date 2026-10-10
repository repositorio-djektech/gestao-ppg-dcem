// Tipos dos objetos extraídos do currículo Lattes XML

export interface LattesDocente {
  id_lattes: string
  nome_completo: string
  citacoes_bibliograficas?: string | null
  orcid?: string | null
  resumo_cv?: string | null
  email?: string | null
  instituicao?: string | null
  orgao?: string | null
  formacao_academica?: Array<{
    tipo: 'GRADUACAO' | 'MESTRADO' | 'DOUTORADO' | 'POS-DOUTORADO' | 'OUTRA'
    curso?: string | null
    instituicao?: string | null
    ano_inicio?: number | null
    ano_conclusao?: number | null
    titulo_trabalho?: string | null
    orientador?: string | null
  }>
}

export interface LattesPublicacao {
  titulo: string
  ano: number
  tipo: 'ARTIGO' | 'LIVRO' | 'CAPITULO'
  doi?: string | null
  veiculo?: string | null // Revista / Periódico / Editora
  issn_isbn?: string | null
  volume?: string | null
  fasciculo?: string | null
  serie?: string | null
  pagina_inicial?: string | null
  pagina_final?: string | null
  autores?: string | null
  natureza?: string | null
}

export interface LattesOrientacao {
  tipo: 'MESTRADO' | 'DOUTORADO' | 'POS-DOUTORADO' | 'GRADUACAO' | 'INICIACAO_CIENTIFICA' | 'OUTRA'
  situacao: 'CONCLUIDA' | 'EM_ANDAMENTO'
  status: 'concluido' | 'em_andamento'
  data_defesa?: string | null // YYYY-MM-DD
  flag_orientador_principal: boolean
  titulo_trabalho?: string | null
  orientando: string
  ano_inicio?: number | null
  ano_conclusao?: number | null
  instituicao?: string | null
  curso?: string | null
  tipo_orientacao?: 'ORIENTADOR_PRINCIPAL' | 'CO_ORIENTADOR'
  bolsa?: boolean | null
  agencia_fomento?: string | null
}

export interface LattesBanca {
  tipo: 'MESTRADO' | 'DOUTORADO' | 'QUALIFICACAO' | 'GRADUACAO' | 'OUTRA'
  titulo_trabalho: string
  candidato?: string | null
  ano: number
  instituicao?: string | null
  curso?: string | null
  participantes?: string | null
}

export interface LattesProjeto {
  nome: string
  ano_inicio?: number | null
  ano_fim?: number | null
  situacao?: string | null
  natureza?: string | null
  descricao?: string | null
  responsavel?: boolean
  equipe?: Array<{
    nome: string
    responsavel: boolean
    id_cnpq?: string | null
  }>
  financiadores?: string[]
}

export interface LattesPremiacao {
  nome: string
  ano: number
  entidade?: string | null
}

export interface LattesProducaoTecnica {
  titulo: string
  ano: number
  tipo: string // Ex: 'TRABALHO_TECNICO', 'SOFTWARE', etc.
  finalidade?: string | null
  autores?: string | null
  instituicao_promotora?: string | null
}

export interface LattesPatente {
  titulo: string
  ano_desenvolvimento?: number | null
  ano_deposito?: number | null
  ano_concessao?: number | null
  numero_registro?: string | null
  instituicao_deposito?: string | null
  autores?: string | null
  categoria?: string | null
}

export interface LattesEvento {
  nome: string
  ano: number
  tipo: 'PARTICIPACAO' | 'TRABALHO' // Participação em evento ou trabalho apresentado em evento
  titulo_trabalho?: string | null
  natureza?: string | null // Completo, Resumo, Resumo expandido
  classificacao?: string | null // Internacional, Nacional, Regional, Local
  cidade?: string | null
  pais?: string | null
  autores?: string | null
}

export interface LattesArquivoResultado {
  nome_arquivo: string
  id_lattes: string
  nome_docente: string
  erro?: string | null
  sucesso: boolean
  // Itens válidos a inserir
  docente?: LattesDocente | null
  publicacoes: LattesPublicacao[]
  orientacoes: LattesOrientacao[]
  bancas: LattesBanca[]
  projetos: LattesProjeto[]
  premiacoes: LattesPremiacao[]
  producoes_tecnicas: LattesProducaoTecnica[]
  patentes: LattesPatente[]
  eventos: LattesEvento[]
  // Contagens totais e ignorados (duplicados ou fora do quadriênio)
  estatisticas: {
    publicacoes: { a_inserir: number; ignorados: number }
    orientacoes: { a_inserir: number; ignorados: number }
    bancas: { a_inserir: number; ignorados: number }
    projetos: { a_inserir: number; ignorados: number }
    premiacoes: { a_inserir: number; ignorados: number }
    producoes_tecnicas: { a_inserir: number; ignorados: number }
    patentes: { a_inserir: number; ignorados: number }
    eventos: { a_inserir: number; ignorados: number }
  }
  // Itens ignorados com motivo (para amostragem ou auditoria)
  itens_ignorados: Array<{
    tabela: string
    identificador: string
    motivo: 'FORA_QUADRIENIO' | 'DUPLICADO' | 'DADOS_INSUFICIENTES'
    ano?: number | null
  }>
}

export type TabelaAlvoId =
  | 'docentes'
  | 'publicacoes'
  | 'orientacoes'
  | 'bancas'
  | 'projetos_pesquisa'
  | 'producao_tecnica'
  | 'patentes'
  | 'premiacoes'
  | 'eventos'

export interface SumarioTabelaRevisao {
  id: TabelaAlvoId
  titulo: string
  totalAInserir: number
  totalIgnorados: number
  amostra: Array<Record<string, unknown>>
  incluirNaGravacao: boolean
}
