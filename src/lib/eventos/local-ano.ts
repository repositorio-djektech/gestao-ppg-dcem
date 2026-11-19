/**
 * Eventos: "Local" e "Ano" no formulário, gravados juntos em `eventos.local_data` (D-28).
 *
 * Formato gravado: "Cidade, UF - AAAA" (o mesmo que o import do Lattes já usa). Sem local, só
 * "AAAA". Sem ano, só o local. Registros antigos em texto livre (ex.: "São Paulo, SP — 10 a
 * 14/11/2025") são lidos pelo ano e pelo trecho antes do primeiro travessão.
 */
import { anoDoValor } from '@/lib/datas/ano'

const SEPARADOR = ' - '
const REGEX_SEPARADOR = /\s[-–—]\s/

/** Junta local e ano no valor gravado em `local_data`. */
export function comporLocalAno(local: unknown, ano: unknown): string {
  const l = String(local ?? '').trim()
  const a = anoDoValor(ano) ?? ''
  return [l, a].filter(Boolean).join(SEPARADOR)
}

/** Separa o valor gravado em local e ano (para o formulário e para a exibição). */
export function separarLocalAno(valor: unknown): { local: string; ano: string } {
  const texto = String(valor ?? '').trim()
  if (!texto) return { local: '', ano: '' }
  const ano = anoDoValor(texto) ?? ''

  // Sem separador: só o ano, ou só o local
  if (!REGEX_SEPARADOR.test(texto)) {
    if (texto === ano) return { local: '', ano }
    // "São Paulo 2025" / "São Paulo, SP, 2025": tira o ano do fim
    const semAno = ano
      ? texto
          .replace(new RegExp(`[\\s,;]*\\b${ano}\\b[\\s,;]*$`), '')
          .replace(/[\s,;]+$/, '')
          .trim()
      : texto
    return { local: semAno, ano }
  }

  const local = texto.split(REGEX_SEPARADOR)[0].trim()
  return { local: local === ano ? '' : local, ano }
}

/** Texto padronizado "Local - AAAA" para tabelas, diálogos e impressões. */
export function exibirLocalAno(valor: unknown): string | null {
  const { local, ano } = separarLocalAno(valor)
  const texto = comporLocalAno(local, ano)
  return texto || null
}
