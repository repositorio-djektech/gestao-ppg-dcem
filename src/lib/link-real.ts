/**
 * Decide se um texto é um link que leva a um site de verdade, para só exibir "link de comprovação"
 * quando ele existe. Rejeita endereços de exemplo (exemplo.com, example.org...), reservados
 * (localhost, .test, .invalid, .example), vazios, sem http(s) e esquemas perigosos (javascript:).
 */
const DOMINIOS_DE_EXEMPLO = [
  'exemplo.com',
  'exemplo.com.br',
  'exemplo.org',
  'exemplo.net',
  'example.com',
  'example.org',
  'example.net',
  'localhost',
]
const TLDS_RESERVADOS = ['test', 'example', 'invalid', 'localhost']

function ehDominioDeExemplo(host: string): boolean {
  if (DOMINIOS_DE_EXEMPLO.some((d) => host === d || host.endsWith(`.${d}`))) return true
  const tld = host.split('.').pop() ?? ''
  return TLDS_RESERVADOS.includes(tld)
}

export function ehLinkReal(url: string | null | undefined): boolean {
  const texto = String(url ?? '').trim()
  if (!texto) return false
  let u: URL
  try {
    u = new URL(texto)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  // Domínio com rótulos válidos (ex.: rejeita "..."); "localhost" cai na lista de exemplos abaixo
  if (host !== 'localhost' && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return !host.startsWith('127.') && host !== '0.0.0.0'
  return !ehDominioDeExemplo(host)
}
