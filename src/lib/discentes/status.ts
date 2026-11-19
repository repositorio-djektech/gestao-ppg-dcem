/**
 * Status do discente (D-26, ajustado pelas D-28 e D-29): só Em andamento, Titulado e Desligado.
 * - Desligado é marcado à mão e prevalece.
 * - Os outros dois vêm da conclusão em MÊS e ANO: sem conclusão ou mês futuro = em andamento;
 *   mês atual ou anterior = titulado (vale a partir do dia 1º do mês, D-29).
 * - Conclusão só com ano (dado antigo) vale como fevereiro daquele ano.
 * - Calculado na leitura, porque um mês futuro vira passado com o tempo (mesmo padrão de
 *   `lib/orientacoes/status.ts`).
 * - A conclusão fica em `ano_conclusao` (texto `AAAA-MM`). A coluna `data_conclusao` (date) não é
 *   mais usada; só é lida em registros antigos que não têm `ano_conclusao`.
 */
import { exibirMesAno, mesAnoAtingido, normalizarMesAno } from '@/lib/datas/mes-ano'

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

type EntradaConclusao = {
  status?: string | null
  ano_conclusao?: string | number | null
  /** Legado: coluna date que a D-28 deixou sem uso. */
  data_conclusao?: string | null
}

/** Conclusão do discente em `AAAA-MM`; se `ano_conclusao` estiver vazio, vale a data antiga. */
export function conclusaoDoDiscente(discente: EntradaConclusao): string | null {
  return normalizarMesAno(discente.ano_conclusao) ?? normalizarMesAno(discente.data_conclusao)
}

export function statusEfetivoDiscente(
  discente: EntradaConclusao,
  hoje: Date = new Date(),
): StatusDiscente {
  const gravado = String(discente.status ?? '')
    .trim()
    .toLowerCase()
  if (gravado === 'desligado') return 'desligado'

  const conclusao = conclusaoDoDiscente(discente)
  return conclusao !== null && mesAnoAtingido(conclusao, hoje) ? 'titulado' : 'em_andamento'
}

/**
 * Formulário: ao mudar a conclusão, o status acompanha (exceto Desligado, que é manual).
 * Sem conclusão volta para em andamento. A data antiga é descartada para não competir com a nova.
 */
export function aplicarConclusaoNoForm<F extends Record<string, any>>(
  form: F,
  novaConclusao: string,
  hoje: Date = new Date(),
): F {
  const conclusao = normalizarMesAno(novaConclusao) ?? ''
  const status = statusEfetivoDiscente({ status: form.status, ano_conclusao: conclusao }, hoje)
  return { ...form, ano_conclusao: conclusao, data_conclusao: '', status }
}

/**
 * Antes de gravar: a conclusão em `AAAA-MM` é a única fonte (a data antiga vira null), e o status
 * gravado é o efetivo.
 */
export function prepararDiscenteParaGravar<F extends Record<string, any>>(
  form: F,
  hoje: Date = new Date(),
): Omit<F, 'ano_conclusao' | 'data_conclusao' | 'status'> & {
  ano_conclusao: string
  data_conclusao: null
  status: StatusDiscente
} {
  const conclusao = conclusaoDoDiscente(form) ?? ''
  const status = statusEfetivoDiscente({ status: form.status, ano_conclusao: conclusao }, hoje)
  return { ...form, ano_conclusao: conclusao, data_conclusao: null, status }
}

/** Conclusão para exibir: `MM/AAAA`; sem conclusão, vazio (a tela mostra o traço). */
export function conclusaoParaExibicao(discente: EntradaConclusao): string {
  return exibirMesAno(conclusaoDoDiscente(discente)) ?? ''
}
