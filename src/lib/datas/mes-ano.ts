/**
 * Mês e ano (D-29): início/término de orientações e projetos, ingresso/conclusão de discentes.
 *
 * - Gravado como `AAAA-MM` (ordena certo como texto); exibido como `MM/AAAA`.
 * - Onde só existe o ano (dados antigos, import do Lattes), o mês é FEVEREIRO (`MES_PADRAO`).
 * - Formatos antigos com dia (AAAA-MM-DD, DD/MM/AAAA) valem pelo mês; o dia é descartado.
 * - Texto sem formato reconhecido (ex.: "Atual") não é interpretado: `parseMesAno` devolve null.
 */

export const MES_PADRAO = 2

export interface MesAno {
  ano: number
  mes: number
  /** true quando o valor não trazia o mês e o padrão (fevereiro) foi usado */
  mesPadrao: boolean
}

function mesValido(m: number): boolean {
  return Number.isInteger(m) && m >= 1 && m <= 12
}

function anoValido(a: number): boolean {
  return Number.isInteger(a) && a >= 1900 && a <= 2100
}

function diaValido(d: number, m: number, a: number): boolean {
  const data = new Date(a, m - 1, d)
  return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d
}

/** Leitura estrita. Aceita AAAA, AAAA-MM, AAAA-MM-DD, MM/AAAA, MM-AAAA e DD/MM/AAAA. */
export function parseMesAno(valor: unknown): MesAno | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') {
    return anoValido(valor) ? { ano: valor, mes: MES_PADRAO, mesPadrao: true } : null
  }
  const t = String(valor).trim()
  if (!t) return null

  let m = t.match(/^(\d{4})$/)
  if (m) {
    const ano = Number(m[1])
    return anoValido(ano) ? { ano, mes: MES_PADRAO, mesPadrao: true } : null
  }

  m = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (m) {
    const ano = Number(m[1])
    const mes = Number(m[2])
    if (!anoValido(ano) || !mesValido(mes)) return null
    if (m[3] !== undefined && !diaValido(Number(m[3]), mes, ano)) return null
    return { ano, mes, mesPadrao: false }
  }

  m = t.match(/^(\d{2})[/-](\d{4})$/)
  if (m) {
    const ano = Number(m[2])
    const mes = Number(m[1])
    return anoValido(ano) && mesValido(mes) ? { ano, mes, mesPadrao: false } : null
  }

  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) {
    const dia = Number(m[1])
    const mes = Number(m[2])
    const ano = Number(m[3])
    if (!anoValido(ano) || !mesValido(mes) || !diaValido(dia, mes, ano)) return null
    return { ano, mes, mesPadrao: false }
  }

  return null
}

/** Valor para gravar: `AAAA-MM`. Sem formato reconhecido, null (o dado não é tocado). */
export function normalizarMesAno(valor: unknown): string | null {
  const p = parseMesAno(valor)
  return p ? `${p.ano}-${String(p.mes).padStart(2, '0')}` : null
}

/** Texto para telas e impressões: `MM/AAAA`. Texto sem formato (ex.: "Atual") sai como está; vazio vira null. */
export function exibirMesAno(valor: unknown): string | null {
  const p = parseMesAno(valor)
  if (p) return `${String(p.mes).padStart(2, '0')}/${p.ano}`
  const texto = String(valor ?? '').trim()
  return texto || null
}

/** Período `MM/AAAA – MM/AAAA` (ou só um lado). Vazio vira null. */
export function exibirPeriodoMesAno(inicio: unknown, fim: unknown): string | null {
  const i = exibirMesAno(inicio)
  const f = exibirMesAno(fim)
  if (i && f) return `${i} – ${f}`
  return i ?? f ?? null
}

/** Ano (AAAA) de um valor em mês/ano, para cálculos por ano. */
export function anoDeMesAno(valor: unknown): number | null {
  return parseMesAno(valor)?.ano ?? null
}

/**
 * O mês já foi atingido? `AAAA-MM` de hoje em diante conta: término 11/2026 já vale em 01/11/2026
 * (D-29). Valor sem formato reconhecido nunca é "atingido".
 */
export function mesAnoAtingido(valor: unknown, hoje: Date = new Date()): boolean {
  const p = parseMesAno(valor)
  if (!p) return false
  return p.ano * 12 + p.mes <= hoje.getFullYear() * 12 + (hoje.getMonth() + 1)
}

/** Antes de gravar: campos de mês/ano com valor antigo passam a `AAAA-MM`. Texto sem formato não é tocado. */
export function normalizarCamposMesAno<T extends Record<string, any>>(
  dados: T,
  chaves: string[],
): T {
  const resultado: Record<string, any> = { ...dados }
  for (const chave of chaves) {
    const novo = normalizarMesAno(resultado[chave])
    if (novo) resultado[chave] = novo
  }
  return resultado as T
}
