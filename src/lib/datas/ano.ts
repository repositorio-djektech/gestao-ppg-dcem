/**
 * Datas só com o ano (D-28).
 *
 * Os campos de data do sistema (ingresso, conclusão, início e término de orientações e projetos,
 * ano do evento) guardam apenas o ANO. Os registros antigos podem ter AAAA-MM-DD, DD/MM/AAAA,
 * MM/AAAA ou texto livre; estas funções leem o ano de qualquer um deles sem alterar o dado.
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

/** Ano como número, para comparações. */
export function anoNumero(valor: unknown): number | null {
  const ano = anoDoValor(valor)
  return ano ? Number(ano) : null
}

/**
 * Texto para tabelas, diálogos e impressões: só o ano. Se o valor não tem ano (ex.: "Atual"
 * vindo do Lattes), mostra o texto como está. Vazio devolve `null` (a tela mostra o traço).
 */
export function exibirAno(valor: unknown): string | null {
  const ano = anoDoValor(valor)
  if (ano) return ano
  const texto = String(valor ?? '').trim()
  return texto || null
}

/** Período "AAAA – AAAA" (ou só o início). Vazio devolve `null`. */
export function exibirPeriodoAnos(inicio: unknown, fim: unknown): string | null {
  const i = exibirAno(inicio)
  const f = exibirAno(fim)
  if (i && f) return `${i} – ${f}`
  return i ?? f ?? null
}

/**
 * O ano já terminou? O ano só "passa" em 31/12: o ano atual ainda está em curso (P-27).
 * Para tratar o ano atual como já concluído, troque `<` por `<=`.
 */
export function anoJaPassou(ano: number | null | undefined, hoje: Date = new Date()): boolean {
  if (ano === null || ano === undefined || !Number.isFinite(ano)) return false
  return ano < hoje.getFullYear()
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
