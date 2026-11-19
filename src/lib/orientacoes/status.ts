/**
 * Funções de derivação de status efetivo para orientações (PPG-DCEM).
 *
 * REGRAS DE DERIVAÇÃO (D-29: início e término em mês e ano):
 * - Se cancelado = true (ou status gravado 'cancelado') -> 'cancelado' (datas preservadas).
 * - Se o término ficar em branco -> 'em_andamento'.
 * - Se o mês do término é posterior ao mês atual -> 'em_andamento'.
 * - Se o mês do término é o mês atual ou anterior -> 'concluido' (vale a partir do dia 1º do mês).
 * - Término só com ano (dado antigo) vale como fevereiro daquele ano.
 * - Valor inválido/irreconhecível NÃO é tratado como concluído -> 'em_andamento'.
 * - Registros antigos com status 'ativo' sem término ou com término futuro -> 'em_andamento'.
 * - Registros antigos 'concluido' sem data de término mantêm 'concluido'.
 */
import { mesAnoAtingido, parseMesAno } from '@/lib/datas/mes-ano'

export type StatusOrientacao = 'ativo' | 'em_andamento' | 'concluido' | 'cancelado'

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

  // 2. Término analisado de forma segura (valor inválido não conta) e comparado pelo MÊS (D-29)
  if (parseMesAno(orientacao.fim) !== null) {
    return mesAnoAtingido(orientacao.fim, dataReferencia) ? 'concluido' : 'em_andamento'
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
