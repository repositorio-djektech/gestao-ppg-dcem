/**
 * Status do discente (D-26): só Em andamento, Titulado e Desligado.
 * - Desligado é marcado à mão e prevalece.
 * - Os outros dois vêm da data de conclusão: sem data ou futura = em andamento; hoje ou passada = titulado.
 * - Calculado na leitura, porque uma data futura vira passada com o tempo (mesmo padrão de
 *   `lib/orientacoes/status.ts`).
 * - Dados antigos (só o ano de conclusão, status gravado concluído/titulado) continuam titulados
 *   quando o ano já ocorreu, para não "des-titular" registros reais por falta de data.
 */
export const STATUS_DISCENTE = ['em_andamento', 'titulado', 'desligado'] as const
export type StatusDiscente = (typeof STATUS_DISCENTE)[number]

const ROTULOS: Record<StatusDiscente, string> = {
  em_andamento: 'Em andamento',
  titulado: 'Titulado',
  desligado: 'Desligado',
}

export function rotuloStatusDiscente(status: StatusDiscente): string {
  return ROTULOS[status] ?? String(status)
}

function parseDataIso(valor: unknown): Date | null {
  const m = String(valor ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(ano, mes - 1, dia, 12, 0, 0)
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return d
}

function inicioDoDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function statusEfetivoDiscente(
  discente: {
    status?: string | null
    data_conclusao?: string | null
    ano_conclusao?: string | number | null
  },
  hoje: Date = new Date(),
): StatusDiscente {
  const gravado = String(discente.status ?? '')
    .trim()
    .toLowerCase()
  if (gravado === 'desligado') return 'desligado'

  const data = parseDataIso(discente.data_conclusao)
  if (data) return inicioDoDia(data) <= inicioDoDia(hoje) ? 'titulado' : 'em_andamento'

  if (gravado === 'titulado' || gravado === 'concluido') {
    const ano = Number(String(discente.ano_conclusao ?? '').trim())
    if (Number.isInteger(ano) && ano > 0 && ano <= hoje.getFullYear()) return 'titulado'
  }
  return 'em_andamento'
}

/**
 * Formulário: ao mudar a data de conclusão, o status acompanha (exceto Desligado, que é manual).
 * Sem data volta para em andamento.
 */
export function aplicarDataConclusaoNoForm<F extends Record<string, any>>(
  form: F,
  novaData: string,
  hoje: Date = new Date(),
): F {
  const status = statusEfetivoDiscente({ status: form.status, data_conclusao: novaData }, hoje)
  return { ...form, data_conclusao: novaData, status }
}

/**
 * Antes de gravar: data vazia vira null (coluna `date`), o status gravado é o efetivo e o ano de
 * conclusão acompanha a data (para telas e relatórios que ainda leem `ano_conclusao`).
 * Sem data, o ano e o status titulado antigos são preservados (dados reais não são apagados).
 */
export function prepararDiscenteParaGravar<F extends Record<string, any>>(
  form: F,
  hoje: Date = new Date(),
): F & { data_conclusao: string | null; status: StatusDiscente } {
  const data = parseDataIso(form.data_conclusao) ? String(form.data_conclusao).slice(0, 10) : null
  const status = statusEfetivoDiscente(
    { status: form.status, data_conclusao: data, ano_conclusao: form.ano_conclusao },
    hoje,
  )
  return {
    ...form,
    data_conclusao: data,
    status,
    ...(data ? { ano_conclusao: data.slice(0, 4) } : {}),
  }
}

/** Conclusão para exibir: data em dd/mm/aaaa; sem data, o ano antigo; sem nada, vazio. */
export function conclusaoParaExibicao(discente: {
  data_conclusao?: string | null
  ano_conclusao?: string | number | null
}): string {
  const data = parseDataIso(discente.data_conclusao)
  if (data) {
    const dd = String(data.getDate()).padStart(2, '0')
    const mm = String(data.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${data.getFullYear()}`
  }
  return String(discente.ano_conclusao ?? '').trim()
}
