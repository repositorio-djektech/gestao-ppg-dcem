import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { parseLattesXml } from './lib/lattes/parser'

describe('parser smoke test', () => {
  it('reads XML and inspects output', () => {
    const buf = fs.readFileSync('docs/3104369029830651.xml')
    const decoder = new TextDecoder('iso-8859-1')
    const xml = decoder.decode(buf)
    const result = parseLattesXml(xml, '3104369029830651.xml')
    console.log('Parsed successfully:', result.nome_docente)
    expect(result.sucesso).toBe(true)
  })
})
