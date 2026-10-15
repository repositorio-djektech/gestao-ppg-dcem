import type { Docente } from '@/types/database'

/**
 * Regras da ficha CAPES para Jovem Doutor Pesquisador (JDP):
 * - Categoria obrigatória: Permanente
 * - Prazo máximo como JDP: 4 anos (jdp_desde + 4 < ano corrente)
 * - Doutorado recente: obtido há menos de 10 anos (ano_doutorado + 10 < ano corrente)
 * - Proporção máxima: JDP válidos não devem exceder 20% do DP (Docentes Permanentes)
 */

export interface StatusJdpDocente {
  isJdp: boolean
  isPermanente: boolean
  jdpDesde: number | null
  anoDoutorado: number | null
  expiradoPorPrazoJdp: boolean
  expiradoPorDoutorado: boolean
  isExpirado: boolean
  motivoExpiracao?: string
  isValido: boolean
}

export interface ResumoJdpPrograma {
  totalDocentes: number
  totalPermanentes: number
  totalJdpMarcados: number
  totalJdpValidos: number
  totalJdpExpirados: number
  limiteMaximoJdp: number
  percentualJdpValido: number
  excedeLimite20Porcento: boolean
  jdpValidos: Docente[]
  jdpExpirados: Docente[]
}

export function parseAnoNumerico(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  if (isNaN(num) || num < 1900 || num > 2100) return null
  return num
}

/**
 * Avalia o status JDP de um docente individual para um determinado ano de referência (default: ano corrente).
 */
export function avaliarStatusJdpDocente(
  docente: Pick<Docente, 'jdp' | 'categoria' | 'jdp_desde' | 'ano_doutorado'>,
  anoReferencia: number = new Date().getFullYear(),
): StatusJdpDocente {
  const isJdp = Boolean(docente.jdp)
  const isPermanente =
    String(docente.categoria || '')
      .toLowerCase()
      .trim() === 'permanente'

  const jdpDesde = parseAnoNumerico(docente.jdp_desde)
  const anoDoutorado = parseAnoNumerico(docente.ano_doutorado)

  if (!isJdp) {
    return {
      isJdp: false,
      isPermanente,
      jdpDesde,
      anoDoutorado,
      expiradoPorPrazoJdp: false,
      expiradoPorDoutorado: false,
      isExpirado: false,
      isValido: false,
    }
  }

  // Regra CAPES: Prazo máximo de 4 anos como JDP
  // Exemplo: se jdp_desde = 2020 e anoReferencia = 2025, 2020 + 4 = 2024 < 2025 -> expirou
  const expiradoPorPrazoJdp = jdpDesde !== null && jdpDesde + 4 < anoReferencia

  // Regra CAPES: Doutorado obtido há menos de 10 anos
  // Exemplo: se ano_doutorado = 2014 e anoReferencia = 2025, 2014 + 10 = 2024 < 2025 -> expirou
  const expiradoPorDoutorado = anoDoutorado !== null && anoDoutorado + 10 < anoReferencia

  const isExpirado = expiradoPorPrazoJdp || expiradoPorDoutorado

  let motivoExpiracao: string | undefined
  if (expiradoPorPrazoJdp && expiradoPorDoutorado) {
    motivoExpiracao = `JDP há mais de 4 anos (desde ${jdpDesde}) e doutorado há mais de 10 anos (${anoDoutorado})`
  } else if (expiradoPorPrazoJdp) {
    motivoExpiracao = `JDP há mais de 4 anos (início em ${jdpDesde}, limite de 4 anos atingido)`
  } else if (expiradoPorDoutorado) {
    motivoExpiracao = `Doutorado obtido há mais de 10 anos (${anoDoutorado})`
  }

  // Válido: é JDP, categoria permanente, não expirou e possui os dados de início
  const isValido = isJdp && isPermanente && !isExpirado

  return {
    isJdp: true,
    isPermanente,
    jdpDesde,
    anoDoutorado,
    expiradoPorPrazoJdp,
    expiradoPorDoutorado,
    isExpirado,
    motivoExpiracao,
    isValido,
  }
}

/**
 * Calcula o conjunto de JDP válidos e as métricas do programa (DP total, limite de 20%, etc).
 * Esta função é consumida pelo motor de fórmulas Q4 e pelos alertas da UI.
 */
export function calcularResumoJdpPrograma(
  docentes: Docente[],
  anoReferencia: number = new Date().getFullYear(),
): ResumoJdpPrograma {
  const permanentes = docentes.filter(
    (d) =>
      String(d.categoria || '')
        .toLowerCase()
        .trim() === 'permanente',
  )
  const totalPermanentes = permanentes.length

  const jdpValidos: Docente[] = []
  const jdpExpirados: Docente[] = []
  let totalJdpMarcados = 0

  for (const doc of docentes) {
    if (doc.jdp) {
      totalJdpMarcados++
      const status = avaliarStatusJdpDocente(doc, anoReferencia)
      if (status.isValido) {
        jdpValidos.push(doc)
      } else if (status.isExpirado) {
        jdpExpirados.push(doc)
      }
    }
  }

  // Limite da CAPES: máximo 20% do DP (arredondamento matemático padrão ou floor/ceil; 20% de DP)
  const limiteMaximoJdp = totalPermanentes > 0 ? Math.floor(totalPermanentes * 0.2) : 0
  const totalJdpValidos = jdpValidos.length
  const totalJdpExpirados = jdpExpirados.length
  const percentualJdpValido = totalPermanentes > 0 ? (totalJdpValidos / totalPermanentes) * 100 : 0
  const excedeLimite20Porcento = totalJdpValidos > limiteMaximoJdp

  return {
    totalDocentes: docentes.length,
    totalPermanentes,
    totalJdpMarcados,
    totalJdpValidos,
    totalJdpExpirados,
    limiteMaximoJdp,
    percentualJdpValido,
    excedeLimite20Porcento,
    jdpValidos,
    jdpExpirados,
  }
}
