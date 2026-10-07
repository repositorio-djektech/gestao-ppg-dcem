import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { processarArquivosLattes } from './processor'
import { mapearDadosParaRevisao } from './revisao'

describe('Diagnóstico XML Euler', () => {
  it('inspeciona dados do XML novo', async () => {
    const buf = fs.readFileSync('docs/0053610145197408.xml')
    const file = new File([buf], '0053610145197408.xml', { type: 'text/xml' })
    const processado = await processarArquivosLattes([file])
    expect(processado.curriculosProcessadosCount).toBe(1)

    const r = processado.resultados[0]
    expect(r.nome_docente).toBeDefined()
    const revisao = mapearDadosParaRevisao(processado)
    expect(revisao).toBeDefined()
  })
})
