import type { Docente, Discente } from '@/types/database'
import type {
  RegraLacuna,
  ResumoRegraLacuna,
  DetalheRegraLacuna,
  RelatorioLacunasResposta,
} from './types'

function textoVazio(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') return val.trim().length === 0
  return false
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

export const TODAS_AS_REGRAS = [...REGRAS_DOCENTES, ...REGRAS_DISCENTES]

export function avaliarColecao<T extends { id: number; nome: string }>(
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

export function consolidarRelatorioLacunas(params: {
  docentes: Docente[]
  discentes: Discente[]
  dataGeracao?: string
}): RelatorioLacunasResposta {
  const { docentes, discentes, dataGeracao } = params

  const resDocentes = avaliarColecao(docentes, REGRAS_DOCENTES)
  const resDiscentes = avaliarColecao(discentes, REGRAS_DISCENTES)

  return {
    gerado_em: dataGeracao || new Date().toISOString(),
    resumo: [...resDocentes.resumo, ...resDiscentes.resumo],
    lacunas: [...resDocentes.lacunas, ...resDiscentes.lacunas],
  }
}
