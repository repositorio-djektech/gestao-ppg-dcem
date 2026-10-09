export type SeveridadeLacuna = 'critica' | 'atencao'
export type TabelaAlvoLacuna = 'docentes' | 'discentes'

export interface ItemLacunaRegistro {
  id: number
  nome: string
  motivo: string
}

export interface RegraLacuna<T = any> {
  id: string
  tabela: TabelaAlvoLacuna
  campos: string[]
  descricao: string
  severidade: SeveridadeLacuna
  grupo: string
  avaliar: (registro: T) => { temLacuna: boolean; motivo?: string }
}

export interface ResumoRegraLacuna {
  grupo: string
  tabela: TabelaAlvoLacuna
  regra_id: string
  descricao: string
  severidade: SeveridadeLacuna
  total_registros: number
  total_lacunas: number
}

export interface DetalheRegraLacuna {
  regra_id: string
  severidade: SeveridadeLacuna
  grupo: string
  registros: ItemLacunaRegistro[]
}

export interface RelatorioLacunasResposta {
  gerado_em: string
  resumo: ResumoRegraLacuna[]
  lacunas: DetalheRegraLacuna[]
}
