export type Role = 'admin' | 'editor' | 'viewer'

export type Profile = {
  id: string
  email: string
  name: string
  role: Role
}

export type Docente = {
  id: string
  nome: string
  scopus_id: string
  indice_h: number
  bolsa_cnpq: string
  jdp: boolean
  licenca: string
}

export type Publicacao = {
  id: string
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
  id: string
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
  id: string
  docente: string
  evento: string
  local_data: string
  papel: string
  link_comprovacao: string
  observacoes: string
}

export type Patente = {
  id: string
  titulo: string
  status: 'Concessão' | 'Licenciamento' | 'Pendente'
  autores: string
  inpi: string
  link_comprovacao: string
  observacoes: string
}

export type Discente = {
  id: string
  nome: string
  cpf: string
  data_ingresso: string
  status: 'ativo' | 'titulado' | 'desligado'
  link_lattes: string
  link_comprovacao: string
  observacoes: string
}

export type Egresso = {
  id: string
  nome: string
  ano_titulacao: number | null
  atuacao_profissional: string
  link_lattes: string
  link_comprovacao: string
  observacoes: string
}

export type Banca = {
  id: string
  titulo_trabalho: string
  data: string
  discente_id: string | null
  membros: string
  tipo: 'Mestrado' | 'Doutorado' | 'Qualificação'
  link_comprovacao: string
  observacoes: string
}

export type Orientacao = {
  id: string
  docente_id: string | null
  discente_id: string | null
  tipo: string
  inicio: string
  fim: string
  status: 'ativo' | 'concluido' | 'cancelado'
  link_comprovacao: string
  observacoes: string
}

export type ProjetoPesquisa = {
  id: string
  titulo: string
  descricao: string
  inicio: string
  fim: string
  coordenador_id: string | null
  financiamento: boolean
  orgao_fomento: string
  link_comprovacao: string
  observacoes: string
}

export type Disciplina = {
  id: string
  nome: string
  codigo: string
  creditos: number
  ano_semestre: string
  link_comprovacao: string
  observacoes: string
}

export type ProducaoTecnica = {
  id: string
  titulo: string
  ano: number | null
  autores: string
  tipo: 'Software' | 'Patente' | 'Relatório'
  link_comprovacao: string
  observacoes: string
}

export type ImpactoSocial = {
  id: string
  titulo: string
  descricao: string
  ano: number | null
  link_comprovacao: string
  observacoes: string
}

export type Premissao = {
  id: string
  titulo: string
  ano: number | null
  nome_premiado: string
  instituicao: string
  link_comprovacao: string
  observacoes: string
}

export type Premicao = {
  id: string
  titulo: string
  ano: number | null
  nome_premiado: string
  instituicao: string
  link_comprovacao: string
  observacoes: string
}
