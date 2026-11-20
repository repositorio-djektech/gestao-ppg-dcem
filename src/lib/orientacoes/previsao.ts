/**
 * Término previsto sugerido (D-34): mestrado 24 meses e doutorado 48 meses a partir do início.
 *
 * Início março/2026 → término fevereiro/2028 (mestrado): o último mês do curso é o do início mais a
 * duração, menos um mês. O término previsto CONCLUI a orientação no mês dele (D-29), então quem
 * precisa de prorrogação (mestrado até 6 meses, doutorado até 12) altera o término ANTES da data.
 * A sugestão só preenche; o mês e o ano continuam livres.
 */
import { normalizarMesAno, parseMesAno } from '@/lib/datas/mes-ano'
import { normalizarCurso, type Curso } from '@/lib/filtros/segmentos'

export const DURACAO_MESES: Record<Curso, number> = { Mestrado: 24, Doutorado: 48 }

/** Término `AAAA-MM` sugerido; null se o tipo não é mestrado/doutorado ou o início é inválido. */
export function sugerirTermino(tipo: unknown, inicio: unknown): string | null {
  const curso = normalizarCurso(tipo)
  const ini = parseMesAno(inicio)
  if (!curso || !ini) return null
  const total = ini.ano * 12 + (ini.mes - 1) + DURACAO_MESES[curso] - 1
  const ano = Math.floor(total / 12)
  const mes = (total % 12) + 1
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/**
 * Atualiza o formulário de uma orientação quando tipo ou início mudam. Preenche o término só se
 * estiver vazio ou se ainda for a sugestão anterior (o usuário não mexeu); término digitado à mão
 * nunca é sobrescrito.
 */
export function aplicarSugestaoTermino<F extends Record<string, any>>(anterior: F, novo: F): F {
  const sugestaoAntiga = sugerirTermino(anterior.tipo, anterior.inicio)
  const fimAtual = normalizarMesAno(novo.fim) ?? ''
  const semMexer = fimAtual === '' || fimAtual === sugestaoAntiga
  if (!semMexer) return novo
  const sugestao = sugerirTermino(novo.tipo, novo.inicio)
  if (sugestao) return { ...novo, fim: sugestao }
  // sem sugestão possível (ex.: virou iniciação): só limpa se o término era a sugestão antiga
  return fimAtual !== '' && fimAtual === sugestaoAntiga ? { ...novo, fim: '' } : novo
}
