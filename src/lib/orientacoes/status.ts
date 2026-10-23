/**
 * Funções seguras de parse e derivação de status efetivo para orientações (PPG-DCEM).
 *
 * REGRAS DE DERIVAÇÃO:
 * - Se cancelado = true (ou status gravado 'cancelado') -> 'cancelado' (datas preservadas).
 * - Se fim ficar em branco -> 'em_andamento'.
 * - Se fim preenchido com data válida > data corrente -> 'em_andamento'.
 * - Se fim preenchido com data válida <= data corrente -> 'concluido'.
 * - Data inválida/irreconhecível NÃO deve ser tratada como concluído -> 'em_andamento'.
 * - Registros antigos com status 'ativo' sem fim ou fim futuro -> 'em_andamento' na leitura.
 * - Registros antigos 'concluido' sem data de término mantêm 'concluido'.
 */

export type StatusOrientacao = 'ativo' | 'em_andamento' | 'concluido' | 'cancelado'

/**
 * Converte de forma segura strings de data vindas do Lattes ou da UI em objeto Date válido.
 * Aceita:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - MM/YYYY ou MM-YYYY (considera o último dia do mês)
 * - YYYY-MM (considera o último dia do mês)
 * - YYYY (considera 31 de dezembro daquele ano)
 * Retorna null se a string for vazia, inválida ou não reconhecida.
 */
export function parseDataFimOrientacao(fim: unknown): Date | null {
  if (fim === null || fim === undefined) return null
  const str = String(fim).trim()
  if (!str) return null

  // 1. YYYY-MM-DD
  const mIso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (mIso) {
    const year = parseInt(mIso[1], 10)
    const month = parseInt(mIso[2], 10)
    const day = parseInt(mIso[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
    return null
  }

  // 2. DD/MM/YYYY
  const mBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (mBr) {
    const day = parseInt(mBr[1], 10)
    const month = parseInt(mBr[2], 10)
    const year = parseInt(mBr[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
    return null
  }

  // 3. MM/YYYY ou MM-YYYY -> último dia do mês
  const mMmYyyy = str.match(/^(\d{2})[/-](\d{4})$/)
  if (mMmYyyy) {
    const month = parseInt(mMmYyyy[1], 10)
    const year = parseInt(mMmYyyy[2], 10)
    if (month >= 1 && month <= 12) {
      // Dia 0 do mês seguinte é o último dia do mês desejado
      const d = new Date(year, month, 0, 12, 0, 0)
      return d
    }
    return null
  }

  // 4. YYYY-MM -> último dia do mês
  const mYyyyMm = str.match(/^(\d{4})-(\d{2})$/)
  if (mYyyyMm) {
    const year = parseInt(mYyyyMm[1], 10)
    const month = parseInt(mYyyyMm[2], 10)
    if (month >= 1 && month <= 12) {
      const d = new Date(year, month, 0, 12, 0, 0)
      return d
    }
    return null
  }

  // 5. YYYY -> 31 de dezembro daquele ano
  const mYyyy = str.match(/^(\d{4})$/)
  if (mYyyy) {
    const year = parseInt(mYyyy[1], 10)
    if (year >= 1900 && year <= 2100) {
      return new Date(year, 11, 31, 12, 0, 0)
    }
    return null
  }

  return null
}

export interface EntradaStatusOrientacao {
  status?: string | null
  fim?: string | null
  cancelado?: boolean | null
}

/**
 * Calcula o status efetivo derivado da orientação.
 * @param orientacao Dados parciais da orientação
 * @param dataReferencia Data base de comparação (default: new Date() no início do dia)
 */
export function calcularStatusEfetivoOrientacao(
  orientacao: EntradaStatusOrientacao,
  dataReferencia: Date = new Date(),
): 'em_andamento' | 'concluido' | 'cancelado' {
  // 1. Switcher Cancelado = TRUE ou status gravado 'cancelado'
  if (orientacao.cancelado === true || orientacao.status === 'cancelado') {
    return 'cancelado'
  }

  // 2. Data de término analisada de forma segura
  const dataFim = parseDataFimOrientacao(orientacao.fim)

  if (dataFim !== null) {
    // Normaliza referência para o início do dia
    const ref = new Date(
      dataReferencia.getFullYear(),
      dataReferencia.getMonth(),
      dataReferencia.getDate(),
      23,
      59,
      59,
      999,
    )
    if (dataFim.getTime() <= ref.getTime()) {
      return 'concluido'
    }
    return 'em_andamento'
  }

  // 3. Se não tem data de término válida:
  // Se o registro antigo já era explicitamente 'concluido' e sem data, preserva 'concluido'
  if (orientacao.status === 'concluido' && (!orientacao.fim || !String(orientacao.fim).trim())) {
    return 'concluido'
  }

  // Se ficou em branco, formato inválido, etc. -> 'em_andamento'
  return 'em_andamento'
}

/**
 * Normaliza um registro de orientação para garantir que seu status efetivo
 * seja refletido em leituras e cálculos em memória.
 */
export function aplicarStatusEfetivo<T extends EntradaStatusOrientacao>(
  ori: T,
): T & {
  status_efetivo: 'em_andamento' | 'concluido' | 'cancelado'
  cancelado: boolean
} {
  const statusEfetivo = calcularStatusEfetivoOrientacao(ori)
  return {
    ...ori,
    status_efetivo: statusEfetivo,
    cancelado: ori.cancelado === true || ori.status === 'cancelado',
  }
}
