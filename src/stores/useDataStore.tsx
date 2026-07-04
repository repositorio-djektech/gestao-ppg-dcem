import React, { createContext, useContext, useState } from 'react'

export type Docente = {
  id: string
  nome: string
  scopusId: string
  indiceH: number
  bolsaCnpq: string
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
  localData: string
  papel: string
}
export type Patente = {
  id: string
  titulo: string
  status: 'Concessão' | 'Licenciamento' | 'Pendente'
  autores: string
  inpi: string
}

interface DataContextType {
  docentes: Docente[]
  publicacoes: Publicacao[]
  mobilidades: Mobilidade[]
  eventos: Evento[]
  patentes: Patente[]
  addDocente: (d: Omit<Docente, 'id'>) => void
  updateDocente: (id: string, d: Omit<Docente, 'id'>) => void
  deleteDocente: (id: string) => void
  addPublicacao: (p: Omit<Publicacao, 'id'>) => void
  updatePublicacao: (id: string, p: Omit<Publicacao, 'id'>) => void
  deletePublicacao: (id: string) => void
  addMobilidade: (m: Omit<Mobilidade, 'id'>) => void
  updateMobilidade: (id: string, m: Omit<Mobilidade, 'id'>) => void
  deleteMobilidade: (id: string) => void
  addEvento: (e: Omit<Evento, 'id'>) => void
  updateEvento: (id: string, e: Omit<Evento, 'id'>) => void
  deleteEvento: (id: string) => void
  addPatente: (p: Omit<Patente, 'id'>) => void
  updatePatente: (id: string, p: Omit<Patente, 'id'>) => void
  deletePatente: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const initialDocentes: Docente[] = [
  {
    id: '1',
    nome: 'Dr. Carlos Roberto',
    scopusId: '123456789',
    indiceH: 25,
    bolsaCnpq: 'PQ 1A',
    jdp: false,
    licenca: '',
  },
  {
    id: '2',
    nome: 'Dra. Aline Mendes',
    scopusId: '987654321',
    indiceH: 18,
    bolsaCnpq: 'PQ 2',
    jdp: true,
    licenca: 'Saúde (2 meses)',
  },
]
const initialPublicacoes: Publicacao[] = [
  {
    id: '1',
    titulo: 'Otimização de Processos Químicos Industriais',
    autores: 'Carlos Roberto, João Silva',
    periodico: 'Chemical Engineering Journal',
    ano: 2025,
    doi: '10.1016/j.cej.2025',
    justificativa: 'Alto impacto na indústria de base.',
  },
]
const initialMobilidades: Mobilidade[] = [
  {
    id: '1',
    tipo: 'docente',
    nome: 'Dra. Aline Mendes',
    instituicao: 'MIT - USA',
    periodo: '01/2025 a 06/2025',
    link: 'https://exemplo.com/doc',
    modalidade: 'internacional',
  },
]
const initialEventos: Evento[] = [
  {
    id: '1',
    docente: 'Dr. Carlos Roberto',
    evento: 'Congresso Brasileiro de Engenharia',
    localData: 'São Paulo - Out/2025',
    papel: 'Coordenador de Comissão Científica',
  },
]
const initialPatentes: Patente[] = [
  {
    id: '1',
    titulo: 'Sistema de Controle Reativo de Polímeros',
    status: 'Concessão',
    autores: 'Carlos Roberto, Marcos Souza',
    inpi: 'BR 10 2025 123456 7',
  },
]

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [docentes, setDocentes] = useState<Docente[]>(initialDocentes)
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>(initialPublicacoes)
  const [mobilidades, setMobilidades] = useState<Mobilidade[]>(initialMobilidades)
  const [eventos, setEventos] = useState<Evento[]>(initialEventos)
  const [patentes, setPatentes] = useState<Patente[]>(initialPatentes)

  const genId = () => Math.random().toString(36).substr(2, 9)

  return (
    <DataContext.Provider
      value={{
        docentes,
        publicacoes,
        mobilidades,
        eventos,
        patentes,
        addDocente: (d) => setDocentes([...docentes, { ...d, id: genId() }]),
        updateDocente: (id, d) =>
          setDocentes(docentes.map((x) => (x.id === id ? { ...d, id } : x))),
        deleteDocente: (id) => setDocentes(docentes.filter((x) => x.id !== id)),
        addPublicacao: (p) => setPublicacoes([...publicacoes, { ...p, id: genId() }]),
        updatePublicacao: (id, p) =>
          setPublicacoes(publicacoes.map((x) => (x.id === id ? { ...p, id } : x))),
        deletePublicacao: (id) => setPublicacoes(publicacoes.filter((x) => x.id !== id)),
        addMobilidade: (m) => setMobilidades([...mobilidades, { ...m, id: genId() }]),
        updateMobilidade: (id, m) =>
          setMobilidades(mobilidades.map((x) => (x.id === id ? { ...m, id } : x))),
        deleteMobilidade: (id) => setMobilidades(mobilidades.filter((x) => x.id !== id)),
        addEvento: (e) => setEventos([...eventos, { ...e, id: genId() }]),
        updateEvento: (id, e) => setEventos(eventos.map((x) => (x.id === id ? { ...e, id } : x))),
        deleteEvento: (id) => setEventos(eventos.filter((x) => x.id !== id)),
        addPatente: (p) => setPatentes([...patentes, { ...p, id: genId() }]),
        updatePatente: (id, p) =>
          setPatentes(patentes.map((x) => (x.id === id ? { ...p, id } : x))),
        deletePatente: (id) => setPatentes(patentes.filter((x) => x.id !== id)),
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export default function useDataStore() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useDataStore must be used within DataProvider')
  return context
}
