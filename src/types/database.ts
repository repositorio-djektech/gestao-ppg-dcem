export type Role = 'admin' | 'editor' | 'viewer'

export type Profile = {
  id: number
  user_id: string
  email: string
  name: string
  role: Role
}

export type Docente = {
  id: number
  nome: string
  scopus_id: string
  indice_h: number
  bolsa_cnpq: string
  jdp: boolean
  licenca: string
  id_lattes?: string | null
  openalex_id?: string | null
}

export type Publicacao = {
  id: number
  titulo: string
  autores: string
  periodico: string
  ano: number
  doi: string
  justificativa: string
  link_comprovacao: string
  observacoes: string
}

export type Mobilidade = {
  id: number
  tipo: 'docente' | 'discente' | 'visitante'
  nome: string
  instituicao: string
  periodo: string
  link: string
  modalidade: 'nacional' | 'internacional'
  link_comprovacao: string
  observacoes: string
}

export type Evento = {
  id: number
  docente: string
  evento: string
  local_data: string
  papel: string
  link_comprovacao: string
  observacoes: string
}

export type Patente = {
  id: number
  titulo: string
  status: 'Concessão' | 'Licenciamento' | 'Pendente'
  autores: string
  inpi: string
  link_comprovacao: string
  observacoes: string
}

export type Discente = {
  id: number
  nome: string
  cpf: string
  data_ingresso: string
  status: 'ativo' | 'titulado' | 'desligado'
  link_lattes: string
  link_comprovacao: string
  observacoes: string
}

export type Egresso = {
  id: number
  nome: string
  ano_titulacao: number | null
  atuacao_profissional: string
  link_lattes: string
  link_comprovacao: string
  observacoes: string
}

export type Banca = {
  id: number
  titulo_trabalho: string
  data: string
  discente_id: number | null
  membros: string
  tipo: 'Mestrado' | 'Doutorado' | 'Qualificação'
  link_comprovacao: string
  observacoes: string
}

export type Orientacao = {
  id: number
  docente_id: number | null
  discente_id: number | null
  tipo: string
  inicio: string
  fim: string
  status: 'ativo' | 'concluido' | 'cancelado'
  link_comprovacao: string
  observacoes: string
}

export type ProjetoPesquisa = {
  id: number
  titulo: string
  descricao: string
  inicio: string
  fim: string
  coordenador_id: number | null
  financiamento: boolean
  orgao_fomento: string
  link_comprovacao: string
  observacoes: string
}

export type Disciplina = {
  id: number
  nome: string
  codigo: string
  creditos: number
  ano_semestre: string
  link_comprovacao: string
  observacoes: string
}

export type ProducaoTecnica = {
  id: number
  titulo: string
  ano: number | null
  autores: string
  tipo: 'Software' | 'Patente' | 'Relatório'
  link_comprovacao: string
  observacoes: string
}

export type ImpactoSocial = {
  id: number
  titulo: string
  descricao: string
  ano: number | null
  link_comprovacao: string
  observacoes: string
}

export type Premissao = {
  id: number
  titulo: string
  ano: number | null
  nome_premiado: string
  instituicao: string
  link_comprovacao: string
  observacoes: string
}

export type Premicao = {
  id: number
  titulo: string
  ano: number | null
  nome_premiado: string
  instituicao: string
  link_comprovacao: string
  observacoes: string
}
