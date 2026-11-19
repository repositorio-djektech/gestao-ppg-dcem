/**
 * D-32: a exportação e o motor acompanham o período do relatório (3 ou 4 anos), sem anos fixos.
 */
import { describe, it, expect } from 'vitest'
import { calcularTodosIndicadores } from './indicadores'
import { gerarHtmlRelatorioIndicadores, gerarCsvIndicadores } from './exportacao'
import type { DadosEntradaIndicadores } from './types'

const doc = (id: number, nome: string) =>
  ({ id, nome, categoria: 'permanente', jdp: false, indice_h: 10 }) as any

function relatorioDe(anoInicio: number, anoFim: number, anoReferencia: number) {
  const dados: DadosEntradaIndicadores = {
    anoReferencia,
    anoInicio,
    anoFim,
    docentes: [doc(1, 'Docente Um'), doc(2, 'Docente Dois')],
    orientacoes: [],
    disciplinas: [],
    projetos: [],
    projetosParticipantes: [],
    publicacoes: [],
    publicacoesDocentes: [],
    publicacoesCoautores: [],
    patentes: [],
    egressos: [],
    discentes: [],
    iniciacoesCientificas: [],
  }
  return calcularTodosIndicadores(dados)
}

describe('Período de 3 anos (2029–2031)', () => {
  const rel = relatorioDe(2029, 2031, 2031)

  it('o motor calcula só os anos do período', () => {
    const so = rel.todosIndicadores.find((i) => i.codigo === 'SO')!
    expect(Object.keys(so.anos || {}).map(Number)).toEqual([2029, 2030, 2031])
    expect(rel.quadrienio).toEqual({ inicio: 2029, fim: 2031 })
  })

  it('o rótulo da MMA usa o número de anos e o intervalo do período', () => {
    const mmas = rel.todosIndicadores.filter((i) => i.mma).map((i) => i.mma!.regra)
    expect(mmas.some((r) => /2025|2028/.test(r))).toBe(false)
    const decomp = rel.todosIndicadores.flatMap((i) => i.decomposicao.map((d) => d.descricao))
    expect(decomp.some((d) => /4 médias|2025-2028/.test(d))).toBe(false)
  })

  it('o CSV tem 3 colunas de ano e "MMA Completo (3 anos)"', () => {
    const cabecalho = gerarCsvIndicadores(rel).split('\r\n')[0]
    expect(cabecalho).toContain('"2029";"2030";"2031"')
    expect(cabecalho).toContain('MMA Completo (3 anos)')
    expect(cabecalho).not.toMatch(/"2025"|"2028"/)
  })

  it('o HTML tem uma coluna por ano do período', () => {
    const html = gerarHtmlRelatorioIndicadores(rel)
    for (const ano of [2029, 2030, 2031]) expect(html).toContain(`>${ano}</th>`)
    expect(html).not.toContain('>2028</th>')
  })
})

describe('Período padrão de 4 anos (2025–2028) segue igual', () => {
  const rel = relatorioDe(2025, 2028, 2026)

  it('CSV com 4 colunas de ano', () => {
    const cabecalho = gerarCsvIndicadores(rel).split('\r\n')[0]
    expect(cabecalho).toContain('"2025";"2026";"2027";"2028"')
    expect(cabecalho).toContain('MMA Completo (4 anos)')
  })

  it('rótulo "Média das 4 médias anuais (2025-2028)" preservado quando o período está completo', () => {
    const completos = rel.todosIndicadores.filter((i) => i.mma?.completo)
    for (const ind of completos) {
      expect(ind.mma!.regra).toMatch(/Média das 4 médias anuais \(MMA 2025–2028/)
    }
  })
})
