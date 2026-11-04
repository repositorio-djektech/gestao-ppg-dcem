import { describe, it, expect } from 'vitest'
import { ehLinkReal } from './link-real'

describe('ehLinkReal: só links que levam a um site de verdade', () => {
  it.each([
    'https://lattes.cnpq.br/1234567890123456',
    'http://www.ufs.br/artigo',
    'https://doi.org/10.1000/xyz123',
    'https://exemplo.ufs.br/pagina', // domínio real que apenas contém "exemplo"
    '  https://www.inpi.gov.br/consulta  ',
  ])('aceita %s', (url) => {
    expect(ehLinkReal(url)).toBe(true)
  })

  it.each([
    'https://exemplo.com/impacto',
    'https://exemplo.com/consultoria',
    'http://www.exemplo.com',
    'https://exemplo.com.br/x',
    'https://example.com',
    'https://sub.example.org/x',
    'https://example.net',
    'https://meusite.example',
    'http://localhost:3000/x',
    'http://127.0.0.1/x',
    'https://servidor.test/x',
    'https://...',
    'https://',
  ])('rejeita o link de exemplo/inválido %s', (url) => {
    expect(ehLinkReal(url)).toBe(false)
  })

  it.each([
    '',
    '   ',
    null,
    undefined,
    'texto qualquer',
    'lattes.cnpq.br/123', // sem protocolo: viraria link relativo quebrado
    'javascript:alert(1)',
    'ftp://servidor.org/arquivo',
    'mailto:alguem@ufs.br',
    'data:text/html,<b>x</b>',
  ])('rejeita o que não é um endereço http(s): %s', (url) => {
    expect(ehLinkReal(url as any)).toBe(false)
  })
})
