/**
 * Datas da iniciação (IC, IT e IE) no formulário (H-31): o início em mês/ano define o ano do plano
 * (o banco também faz isso). O término em branco vale dezembro do ano do início ao criar; ao editar,
 * deixa a orientação correspondente em andamento (migração 20261122130000).
 */
import { anoDeMesAno } from '@/lib/datas/mes-ano'

export function aplicarInicioNoForm<F extends Record<string, any>>(form: F, inicio: string): F {
  return { ...form, inicio, ano: anoDeMesAno(inicio) ?? form.ano }
}
