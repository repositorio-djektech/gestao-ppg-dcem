/**
 * Import do Lattes: IC concluída vem dentro de OUTRAS-ORIENTACOES-CONCLUIDAS (NATUREZA =
 * INICIACAO_CIENTIFICA, nome em NOME-DO-ORIENTADO). Antes o parser a descartava (H-25, D-30).
 * O Lattes só tem "iniciação científica": IT e IE não existem no XML.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseLattesXml, decodificarXmlArrayBuffer } from './parser'

function ler(arquivo: string, inicio: number, fim: number): any {
  const buf = fs.readFileSync(arquivo)
  const xml = decodificarXmlArrayBuffer(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  )
  return parseLattesXml(xml, arquivo, inicio, fim)
}

const CURRICULOS = ['docs/0053610145197408.xml', 'docs/3104369029830651.xml']

describe('Parser Lattes: iniciação científica concluída', () => {
  it.each(CURRICULOS)('%s: lê as IC concluídas (antes eram descartadas)', (arquivo) => {
    const r = ler(arquivo, 2017, 2028)
    const ic = r.orientacoes.filter((o: any) => o.tipo === 'INICIACAO_CIENTIFICA')
    const concluidas = ic.filter((o: any) => o.situacao === 'CONCLUIDA')
    expect(concluidas.length).toBeGreaterThan(0)
    for (const o of concluidas) {
      expect(o.orientando).toBeTruthy()
      expect(o.status).toBe('concluido')
      expect(o.ano_conclusao).toBeGreaterThanOrEqual(2017)
      expect(o.flag_orientador_principal).toBe(true)
    }
  })

  it('a IC em andamento (tag própria) continua sendo lida', () => {
    const r = ler('docs/0053610145197408.xml', 2025, 2028)
    const andamento = r.orientacoes.filter(
      (o: any) => o.tipo === 'INICIACAO_CIENTIFICA' && o.situacao === 'EM_ANDAMENTO',
    )
    expect(andamento.length).toBe(3)
  })

  it.each(CURRICULOS)(
    '%s: TCC, monografia e "outra natureza" concluídos continuam fora',
    (arquivo) => {
      const r = ler(arquivo, 2017, 2028)
      const outrosConcluidos = r.orientacoes.filter(
        (o: any) =>
          o.situacao === 'CONCLUIDA' &&
          !['MESTRADO', 'DOUTORADO', 'POS-DOUTORADO', 'INICIACAO_CIENTIFICA'].includes(o.tipo),
      )
      expect(outrosConcluidos).toEqual([])
    },
  )

  it('o Lattes só traz iniciação científica: nenhum registro vem como tecnológica ou extensão', () => {
    for (const arquivo of CURRICULOS) {
      const r = ler(arquivo, 2017, 2028)
      const tipos = new Set(r.orientacoes.map((o: any) => o.tipo))
      for (const t of tipos) {
        expect(String(t)).not.toMatch(/TECNOLOGICA|EXTENSAO/)
      }
    }
  })
})
