/**
 * Início da orientação a partir do ingresso do discente (D-28).
 *
 * Ao escolher o discente no formulário de Orientações, o início vem preenchido com o ano de
 * ingresso dele (tabela `discentes`). O usuário ainda pode alterar. Discente sem ingresso não mexe
 * no início que já estava preenchido.
 */
import { anoDoValor } from '@/lib/datas/ano'

export function mapaIngressoPorDiscente(
  discentes: Array<{ id: number | string; data_ingresso?: string | null }>,
): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const d of discentes) {
    const ano = anoDoValor(d.data_ingresso)
    if (ano) mapa[String(d.id)] = ano
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
