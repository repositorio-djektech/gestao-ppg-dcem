/**
 * Import do Lattes (D-31): orientações em andamento sempre entram (com ano de INÍCIO e sem
 * término); concluídas usam o nome em NOME-DO-ORIENTADO e a janela de importação.
 * Usa os dois currículos reais de docs/.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseLattesXml, decodificarXmlArrayBuffer } from './parser'
import { processarArquivosLattes } from './processor'
import { janelaImportacaoPadrao, intervaloCruzaJanela, ANO_INICIO_IMPORTACAO } from './quadrienio'

const CV1 = 'docs/0053610145197408.xml'
const CV2 = 'docs/3104369029830651.xml'

function ler(arquivo: string, inicio: number, fim: number): any {
  const buf = fs.readFileSync(arquivo)
  const xml = decodificarXmlArrayBuffer(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  )
  return parseLattesXml(xml, arquivo, inicio, fim)
}

describe('Janela de importação (D-31)', () => {
  it('o padrão começa em 2020 e vai até o fim do período de avaliação ou o ano atual', () => {
    expect(ANO_INICIO_IMPORTACAO).toBe(2020)
    expect(janelaImportacaoPadrao(new Date(2026, 5, 1))).toEqual({ anoInicio: 2020, anoFim: 2028 })
    expect(janelaImportacaoPadrao(new Date(2030, 0, 1))).toEqual({ anoInicio: 2020, anoFim: 2030 })
  })

  it('intervalo cruza a janela: em aberto vale até hoje; sem datas não cruza', () => {
    const j = { anoInicio: 2020, anoFim: 2028 }
    expect(intervaloCruzaJanela(2018, null, j)).toBe(true) // começou antes e segue em aberto
    expect(intervaloCruzaJanela(2010, 2015, j)).toBe(false)
    expect(intervaloCruzaJanela(2019, 2021, j)).toBe(true)
    expect(intervaloCruzaJanela(2029, 2030, j)).toBe(false)
    expect(intervaloCruzaJanela(null, 2022, j)).toBe(true)
    expect(intervaloCruzaJanela(null, null, j)).toBe(false)
  })
})

describe('Orientações em andamento', () => {
  it('têm ano de início e NENHUM término (antes o ano de início virava conclusão)', () => {
    const r = ler(CV1, 2020, 2028)
    const andamento = r.orientacoes.filter((o: any) => o.situacao === 'EM_ANDAMENTO')
    expect(andamento.length).toBeGreaterThan(0)
    for (const o of andamento) {
      expect(o.status).toBe('em_andamento')
      expect(o.ano_inicio).toBeGreaterThanOrEqual(2000)
      expect(o.ano_conclusao).toBeNull()
      expect(o.data_defesa).toBeNull()
    }
  })

  it('entram qualquer que seja o ano de início (janela posterior não as corta)', () => {
    const larga = ler(CV1, 2020, 2028)
    const estreita = ler(CV1, 2030, 2031) // janela que não contém nenhum ano do currículo
    const andLarga = larga.orientacoes.filter((o: any) => o.situacao === 'EM_ANDAMENTO')
    const andEstreita = estreita.orientacoes.filter((o: any) => o.situacao === 'EM_ANDAMENTO')
    expect(andEstreita.length).toBe(andLarga.length)
    expect(andEstreita.length).toBeGreaterThan(0)
    // e as concluídas, essas sim, obedecem à janela
    expect(estreita.orientacoes.filter((o: any) => o.situacao === 'CONCLUIDA')).toEqual([])
  })

  it('tese iniciada antes de 2025 e ainda em andamento aparece com a janela padrão (caso "Jéssica")', () => {
    // CV1 tem 1 mestrado e 1 doutorado em andamento iniciados em 2024 (antes eram descartados)
    const antigas = ler(CV1, 2020, 2028).orientacoes.filter(
      (o: any) =>
        o.situacao === 'EM_ANDAMENTO' &&
        ['MESTRADO', 'DOUTORADO'].includes(o.tipo) &&
        o.ano_inicio < 2025,
    )
    expect(antigas.map((o: any) => o.tipo).sort()).toEqual(['DOUTORADO', 'MESTRADO'])
    for (const o of antigas) expect(o.ano_inicio).toBe(2024)
  })

  it('nenhuma orientação em andamento do currículo é perdida', () => {
    // contagem de tags EM-ANDAMENTO no XML = o que o parser devolve com qualquer janela
    for (const arquivo of [CV1, CV2]) {
      const xml = fs.readFileSync(arquivo, 'latin1')
      const noXml =
        (xml.match(/<ORIENTACAO-EM-ANDAMENTO-DE-[A-Z-]+[ >]/g) || []).length +
        (xml.match(/<OUTRAS-ORIENTACOES-EM-ANDAMENTO[ >]/g) || []).length
      const doParser = ler(arquivo, 2030, 2031).orientacoes.filter(
        (o: any) => o.situacao === 'EM_ANDAMENTO',
      ).length
      expect(doParser).toBe(noXml)
    }
  })
})

describe('Orientações concluídas (mestrado, doutorado, pós-doutorado)', () => {
  it('lê o nome em NOME-DO-ORIENTADO: o mestrado concluído em 2025 e o de 2026 entram', () => {
    const r = ler(CV1, 2020, 2028)
    const mestrado = r.orientacoes.filter(
      (o: any) => o.situacao === 'CONCLUIDA' && o.tipo === 'MESTRADO',
    )
    const anos = mestrado.map((o: any) => o.ano_conclusao)
    expect(anos).toEqual(expect.arrayContaining([2025, 2026]))
    for (const o of mestrado) {
      expect(o.orientando).toBeTruthy()
      expect(o.status).toBe('concluido')
    }
  })

  it('doutorado concluído também entra', () => {
    const r = ler(CV2, 2020, 2028)
    const doutorado = r.orientacoes.filter(
      (o: any) => o.situacao === 'CONCLUIDA' && o.tipo === 'DOUTORADO',
    )
    expect(doutorado.length).toBeGreaterThan(0)
  })

  it('pós-doutorado não é confundido com doutorado', () => {
    const r = ler(CV2, 2000, 2028)
    const pos = r.orientacoes.filter((o: any) => o.tipo === 'POS-DOUTORADO')
    expect(pos.length).toBeGreaterThan(0)
  })

  it('TCC, monografia e "outra natureza" concluídos seguem fora, com o motivo registrado', () => {
    const r = ler(CV1, 2020, 2028)
    const naoImportados = r.itens_ignorados.filter((i: any) => i.motivo === 'TIPO_NAO_IMPORTADO')
    expect(naoImportados.length).toBeGreaterThan(0)
    const outros = r.orientacoes.filter(
      (o: any) =>
        o.situacao === 'CONCLUIDA' &&
        !['MESTRADO', 'DOUTORADO', 'POS-DOUTORADO', 'INICIACAO_CIENTIFICA'].includes(o.tipo),
    )
    expect(outros).toEqual([])
  })

  it('as concluídas obedecem à janela: com início em 2025 não entram as de 2023', () => {
    const r = ler(CV1, 2025, 2028)
    const anos = r.orientacoes
      .filter((o: any) => o.situacao === 'CONCLUIDA')
      .map((o: any) => o.ano_conclusao)
    expect(anos.length).toBeGreaterThan(0)
    expect(Math.min(...anos)).toBeGreaterThanOrEqual(2025)
  })
})

describe('processarArquivosLattes com a janela padrão', () => {
  it('traz as concluídas desde 2020 e as em andamento de qualquer ano', async () => {
    const buf = fs.readFileSync(CV1)
    const arquivo = new File([buf], 'cv1.xml', { type: 'text/xml' })
    const padrao: any = await processarArquivosLattes([arquivo])
    const apertada: any = await processarArquivosLattes([arquivo], {
      anoInicio: 2025,
      anoFim: 2028,
    })
    const nPadrao = padrao.resultados[0].orientacoes.length
    const nApertada = apertada.resultados[0].orientacoes.length
    expect(nPadrao).toBeGreaterThan(nApertada)
    // em andamento é igual nas duas janelas
    const andamento = (r: any) =>
      r.resultados[0].orientacoes.filter((o: any) => o.situacao === 'EM_ANDAMENTO').length
    expect(andamento(padrao)).toBe(andamento(apertada))
  })
})
