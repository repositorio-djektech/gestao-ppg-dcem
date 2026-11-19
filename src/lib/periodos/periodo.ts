/**
 * Períodos de avaliação CAPES e janela do Lattes configuráveis (D-32).
 *
 * Funções puras (sem banco): o serviço `services/periodos.ts` lê e grava, e o contexto
 * `hooks/use-periodo.tsx` entrega o período ativo às telas. Sem configuração (ou se a leitura
 * falhar), vale o período padrão 2025–2028 e a janela do Lattes a partir de 2020.
 */
import {
  ANO_INICIO,
  ANO_FIM,
  ANO_INICIO_IMPORTACAO,
  type JanelaAnos,
} from '@/lib/lattes/quadrienio'

export interface PeriodoAvaliacao {
  id: number | null
  nome: string
  anoInicio: number
  anoFim: number
  ativo: boolean
  /** Vazio = ano corrente, limitado ao intervalo do período. */
  anoReferencia: number | null
}

export interface ConfiguracaoPpg {
  lattesAnoInicio: number
  /** Vazio = até o fim do período ativo ou o ano atual (o maior). */
  lattesAnoFim: number | null
}

export const ANO_MINIMO = 1990
export const ANO_MAXIMO = 2100
/** Um período aceita de 1 a 10 anos (a CAPES usa 3 ou 4). */
export const MAX_DURACAO_ANOS = 10

export const PERIODO_PADRAO: PeriodoAvaliacao = {
  id: null,
  nome: `Quadriênio ${ANO_INICIO}–${ANO_FIM}`,
  anoInicio: ANO_INICIO,
  anoFim: ANO_FIM,
  ativo: true,
  anoReferencia: null,
}

export const CONFIGURACAO_PADRAO: ConfiguracaoPpg = {
  lattesAnoInicio: ANO_INICIO_IMPORTACAO,
  lattesAnoFim: null,
}

/** `2025–2028`. */
export function rotuloPeriodo(p: Pick<PeriodoAvaliacao, 'anoInicio' | 'anoFim'>): string {
  return `${p.anoInicio}–${p.anoFim}`
}

/** Anos do período, em ordem: `[2025, 2026, 2027, 2028]`. */
export function anosDoPeriodo(p: Pick<PeriodoAvaliacao, 'anoInicio' | 'anoFim'>): number[] {
  const anos: number[] = []
  for (let a = p.anoInicio; a <= p.anoFim; a++) anos.push(a)
  return anos
}

/**
 * Ano de referência dos indicadores (anos depois dele ficam "indefinidos"). Vale o definido no
 * período; senão o ano corrente, limitado ao intervalo: período passado usa o último ano (tudo
 * calculado) e período futuro usa o primeiro.
 */
export function anoReferenciaDoPeriodo(
  p: Pick<PeriodoAvaliacao, 'anoInicio' | 'anoFim' | 'anoReferencia'>,
  hoje: Date = new Date(),
): number {
  if (p.anoReferencia !== null && p.anoReferencia !== undefined) return p.anoReferencia
  return Math.min(Math.max(hoje.getFullYear(), p.anoInicio), p.anoFim)
}

/** Mensagem de erro, ou null se o período é válido. */
export function validarPeriodo(p: {
  nome: string
  anoInicio: number
  anoFim: number
  anoReferencia?: number | null
}): string | null {
  if (!p.nome || !p.nome.trim()) return 'Informe o nome do período.'
  if (!Number.isInteger(p.anoInicio) || !Number.isInteger(p.anoFim)) {
    return 'Informe o ano inicial e o ano final.'
  }
  if (p.anoInicio < ANO_MINIMO || p.anoFim > ANO_MAXIMO) {
    return `Use anos entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`
  }
  if (p.anoInicio > p.anoFim) return 'O ano inicial não pode ser maior que o final.'
  if (p.anoFim - p.anoInicio + 1 > MAX_DURACAO_ANOS) {
    return `O período pode ter no máximo ${MAX_DURACAO_ANOS} anos.`
  }
  if (p.anoReferencia !== null && p.anoReferencia !== undefined) {
    if (
      !Number.isInteger(p.anoReferencia) ||
      p.anoReferencia < ANO_MINIMO ||
      p.anoReferencia > ANO_MAXIMO
    ) {
      return 'O ano de referência é inválido.'
    }
  }
  return null
}

export function validarConfiguracao(c: ConfiguracaoPpg): string | null {
  if (!Number.isInteger(c.lattesAnoInicio)) return 'Informe o ano inicial da importação do Lattes.'
  if (c.lattesAnoInicio < ANO_MINIMO || c.lattesAnoInicio > ANO_MAXIMO) {
    return `Use anos entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`
  }
  if (c.lattesAnoFim !== null) {
    if (!Number.isInteger(c.lattesAnoFim) || c.lattesAnoFim > ANO_MAXIMO) {
      return 'O ano final da importação é inválido.'
    }
    if (c.lattesAnoFim < c.lattesAnoInicio) {
      return 'O ano final da importação não pode ser menor que o inicial.'
    }
  }
  return null
}

/** Janela padrão do import do Lattes: a configurada, com o fim padrão = fim do período ou ano atual. */
export function janelaLattes(
  config: ConfiguracaoPpg,
  periodo: Pick<PeriodoAvaliacao, 'anoFim'>,
  hoje: Date = new Date(),
): JanelaAnos {
  return {
    anoInicio: config.lattesAnoInicio,
    anoFim: config.lattesAnoFim ?? Math.max(periodo.anoFim, hoje.getFullYear()),
  }
}

/** Converte a linha do banco (`periodos_avaliacao`) no tipo da aplicação. */
export function periodoDeLinha(l: {
  id: number
  nome: string
  ano_inicio: number
  ano_fim: number
  ativo: boolean
  ano_referencia?: number | null
}): PeriodoAvaliacao {
  return {
    id: l.id,
    nome: l.nome,
    anoInicio: l.ano_inicio,
    anoFim: l.ano_fim,
    ativo: l.ativo,
    anoReferencia: l.ano_referencia ?? null,
  }
}

/** Converte a linha de `ppg_configuracoes`. */
export function configuracaoDeLinha(l: {
  lattes_ano_inicio: number
  lattes_ano_fim?: number | null
}): ConfiguracaoPpg {
  return { lattesAnoInicio: l.lattes_ano_inicio, lattesAnoFim: l.lattes_ano_fim ?? null }
}
