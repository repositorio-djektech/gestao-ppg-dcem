/**
 * Campos que guardam só o ANO (D-28): ano de ingresso e de titulação de egressos e o ano do evento.
 * (Ingresso/conclusão de discentes e início/término de orientações e projetos passaram a mês e ano
 * na D-29: ver `mes-ano.ts`.) Os registros antigos podem ter AAAA-MM-DD, DD/MM/AAAA, MM/AAAA ou
 * texto livre; `anoDoValor` lê o ano de qualquer um deles sem alterar o dado.
 */

const REGEX_ANO = /\b(19\d{2}|20\d{2})\b/

/** Ano (AAAA) contido no valor, em qualquer formato legado. Sem ano reconhecível, `null`. */
export function anoDoValor(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor >= 1900 && valor <= 2099 ? String(valor) : null
  }
  const texto = String(valor).trim()
  if (!texto) return null
  // AAAA-MM-DD / AAAA-MM: o ano vem colado ao hífen, que \b trata como limite de palavra
  const m = texto.match(REGEX_ANO)
  return m ? m[1] : null
}

/**
 * Antes de gravar: campos de ano com valor antigo (data completa, mês/ano) passam a guardar só o
 * ano. Valor sem ano reconhecível (ex.: "Atual") não é tocado, para não apagar dado real.
 */
export function normalizarCamposAno<T extends Record<string, any>>(dados: T, chaves: string[]): T {
  const resultado: Record<string, any> = { ...dados }
  for (const chave of chaves) {
    const atual = resultado[chave]
    if (typeof atual === 'number') continue
    const ano = anoDoValor(atual)
    if (ano) resultado[chave] = ano
  }
  return resultado as T
}
