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
}

export type Mobilidade = {
  id: string
  tipo: 'docente' | 'discente' | 'visitante'
  nome: string
  instituicao: string
  periodo: string
  link: string
  modalidade: 'nacional' | 'internacional'
}

export type Evento = {
  id: string
  docente: string
  evento: string
  local_data: string
  papel: string
}

export type Patente = {
  id: string
  titulo: string
  status: 'Concessão' | 'Licenciamento' | 'Pendente'
  autores: string
  inpi: string
}
