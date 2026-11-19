/**
 * Início da orientação a partir do ingresso do discente (D-28, D-29).
 *
 * Ao escolher o discente no formulário de Orientações, o início vem preenchido com o mês e ano de
 * ingresso dele (tabela `discentes`, `AAAA-MM`; ingresso só com ano vale como fevereiro). O usuário ainda pode alterar. Discente sem ingresso não mexe
 * no início que já estava preenchido.
 */
import { normalizarMesAno } from '@/lib/datas/mes-ano'

export function mapaIngressoPorDiscente(
  discentes: Array<{ id: number | string; data_ingresso?: string | null }>,
): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const d of discentes) {
    const ingresso = normalizarMesAno(d.data_ingresso)
    if (ingresso) mapa[String(d.id)] = ingresso
  }
  return mapa
}

export function aplicarDiscenteNoForm<F extends Record<string, any>>(
  form: F,
  discenteId: string,
  ingressoPorDiscente: Record<string, string>,
): F {
  const ingresso = ingressoPorDiscente[String(discenteId)]
  return { ...form, discente_id: discenteId, ...(ingresso ? { inicio: ingresso } : {}) }
}
