import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { parseLattesXml } from './lib/lattes/parser'

describe('parser raw extraction test', () => {
  it('extracts all items', () => {
    const buf = fs.readFileSync('docs/3104369029830651.xml')
    const decoder = new TextDecoder('iso-8859-1')
    const xml = decoder.decode(buf)
    const res = parseLattesXml(xml, 'curriculo.xml')

    // Let's inspect parser output
    expect(res.sucesso).toBe(true)
    expect(res.id_lattes).toBe('3104369029830651')
    expect(res.nome_docente).toBeTruthy()
    // print some info in test failure or assertion
    expect({
      pubCount: res.publicacoes.length,
      pubIgn: res.estatisticas.publicacoes.ignorados,
      oriCount: res.orientacoes.length,
      oriIgn: res.estatisticas.orientacoes.ignorados,
      bancasCount: res.bancas.length,
      bancasIgn: res.estatisticas.bancas.ignorados,
    }).toEqual({
      pubCount: 0,
      pubIgn: 0,
      oriCount: 0,
      oriIgn: 0,
      bancasCount: 0,
      bancasIgn: 0,
    })
  })
})
