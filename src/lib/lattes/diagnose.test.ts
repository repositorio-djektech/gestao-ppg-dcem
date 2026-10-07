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

    for (const [tabela, dados] of Object.entries(revisao)) {
      console.log(`Tabela ${tabela}: ${dados.itens.length} itens`)
      for (const item of dados.itens) {
        for (const [campo, val] of Object.entries(item)) {
          if (val === undefined) {
            console.log(`CAMPO UNDEFINED: tabela=${tabela}, campo=${campo}, id=${(item as any).id}`)
          }
        }
      }
    }

    // Também testar a conversão para gravação de todos os itens gerados
    const res = processado.resultados[0]
    console.log('Docente objeto:', JSON.stringify(res.docente, null, 2))
    console.log('Projetos objeto count:', res.projetos.length)
    if (res.projetos.length > 0) {
      console.log('Primeiro projeto:', JSON.stringify(res.projetos[0], null, 2))
    }
  })
})
