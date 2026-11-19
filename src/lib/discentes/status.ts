/**
 * Status do discente (D-26, ajustado pela D-28): só Em andamento, Titulado e Desligado.
 * - Desligado é marcado à mão e prevalece.
 * - Os outros dois vêm do ANO de conclusão: sem ano = em andamento; ano posterior ou igual ao atual
 *   = em andamento (o ano só passa em 31/12); ano anterior ao atual = titulado.
 * - Calculado na leitura, porque um ano futuro vira passado com o tempo (mesmo padrão de
 *   `lib/orientacoes/status.ts`).
 * - Registros antigos que só têm `data_conclusao` (coluna date, sem uso desde a D-28) valem pelo
 *   ano dela quando não há `ano_conclusao`.
 */
import { anoDoValor, anoJaPassou } from '@/lib/datas/ano'

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

/** Ano de conclusão do discente: o campo atual; se vazio, o ano da data antiga. */
export function anoConclusaoDoDiscente(discente: EntradaConclusao): string | null {
  return anoDoValor(discente.ano_conclusao) ?? anoDoValor(discente.data_conclusao)
}

export function statusEfetivoDiscente(
  discente: EntradaConclusao,
  hoje: Date = new Date(),
): StatusDiscente {
  const gravado = String(discente.status ?? '')
    .trim()
    .toLowerCase()
  if (gravado === 'desligado') return 'desligado'

  const ano = anoConclusaoDoDiscente(discente)
  return ano !== null && anoJaPassou(Number(ano), hoje) ? 'titulado' : 'em_andamento'
}

/**
 * Formulário: ao mudar o ano de conclusão, o status acompanha (exceto Desligado, que é manual).
 * Sem ano volta para em andamento. A data antiga é descartada para não competir com o ano novo.
 */
export function aplicarAnoConclusaoNoForm<F extends Record<string, any>>(
  form: F,
  novoAno: string,
  hoje: Date = new Date(),
): F {
  const ano = anoDoValor(novoAno) ?? ''
  const status = statusEfetivoDiscente({ status: form.status, ano_conclusao: ano }, hoje)
  return { ...form, ano_conclusao: ano, data_conclusao: '', status }
}

/**
 * Antes de gravar: o ano de conclusão é a única fonte (a data antiga vira null), e o status
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
  const ano = anoConclusaoDoDiscente(form) ?? ''
  const status = statusEfetivoDiscente({ status: form.status, ano_conclusao: ano }, hoje)
  return { ...form, ano_conclusao: ano, data_conclusao: null, status }
}

/** Conclusão para exibir: só o ano; sem ano, vazio (a tela mostra o traço). */
export function conclusaoParaExibicao(discente: EntradaConclusao): string {
  return anoConclusaoDoDiscente(discente) ?? ''
}
