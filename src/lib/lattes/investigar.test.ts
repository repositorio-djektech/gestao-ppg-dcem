import { describe, it } from 'vitest'
import fs from 'node:fs'
import { parseLattesXml } from './parser'
import { decodificarIso88591 } from './readFiles'
import { processarArquivosLattes } from './processor'
import { mapearDadosParaRevisao } from './revisao'

describe('Investigação do XML real de homologação', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('audita contagens brutas do XML vs contagens no quadriênio 2022-2025', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xml = decodificarIso88591(rawBuffer)

    // Parser direto
    const parsed = parseLattesXml(xml, '3104369029830651.xml')
    console.log('Docente detectado:', parsed.nome_docente)

    // Processamento completo
    const file = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })
    const processado = await processarArquivosLattes([file])
    const tabelas = mapearDadosParaRevisao(processado)

    console.log('--- RESUMO DAS SEÇÕES DO PROCESSADOR (2022-2025) ---')
    for (const [k, v] of Object.entries(processado.resumoGeral.secoes)) {
      console.log(
        `${k}: val=${v.totalValidos}, dup=${v.totalDuplicados}, foraQuad=${v.totalForaQuadrienio}, lidos=${v.totalLidos}`,
      )
    }

    console.log('--- RESUMO DAS TABELAS MAPEADAS PARA REVISÃO ---')
    for (const [tId, tData] of Object.entries(tabelas)) {
      console.log(
        `${tId}: inseridos=${tData.inseridos}, atualizados=${tData.atualizados}, ignorados=${tData.ignorados}, itens=${tData.itens.length}`,
      )
    }
  })
})
