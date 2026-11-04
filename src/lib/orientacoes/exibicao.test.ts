import { describe, it, expect } from 'vitest'
import {
  classeBadgeTipoOrientacao,
  formatarDataOrientacao,
  semDatasDefinidas,
  filtrarOrientacoesDoDocente,
} from './exibicao'

describe('Tipos de orientação com cores diferentes', () => {
  it('Mestrado e Doutorado têm cores diferentes entre si e das demais', () => {
    const mestrado = classeBadgeTipoOrientacao('Mestrado')
    const doutorado = classeBadgeTipoOrientacao('Doutorado')
    expect(mestrado).not.toBe(doutorado)
    for (const outro of [
      'Pós-Doutorado',
      'Iniciação Científica',
      'TCC / Graduação',
      '',
      undefined,
    ]) {
      expect(classeBadgeTipoOrientacao(outro as any)).not.toBe(mestrado)
      expect(classeBadgeTipoOrientacao(outro as any)).not.toBe(doutorado)
    }
  })

  it('ignora caixa e acentos no tipo', () => {
    expect(classeBadgeTipoOrientacao('MESTRADO')).toBe(classeBadgeTipoOrientacao('Mestrado'))
    expect(classeBadgeTipoOrientacao(' doutorado ')).toBe(classeBadgeTipoOrientacao('Doutorado'))
  })
})

describe('Datas da tabela de orientações', () => {
  it('data completa vira dd/mm/aaaa; ano ou texto ficam como estão; vazio vira null', () => {
    expect(formatarDataOrientacao('2025-03-09')).toBe('09/03/2025')
    expect(formatarDataOrientacao('2025')).toBe('2025')
    expect(formatarDataOrientacao('03/2025')).toBe('03/2025')
    expect(formatarDataOrientacao('')).toBeNull()
    expect(formatarDataOrientacao('   ')).toBeNull()
    expect(formatarDataOrientacao(null)).toBeNull()
    expect(formatarDataOrientacao(undefined)).toBeNull()
  })

  it('sem datas definidas: nenhum início nem término (ficha o traço em Início, Término e Status)', () => {
    expect(semDatasDefinidas({ inicio: '', fim: '' })).toBe(true)
    expect(semDatasDefinidas({ inicio: null, fim: undefined })).toBe(true)
    expect(semDatasDefinidas({ inicio: '2025', fim: '' })).toBe(false)
    expect(semDatasDefinidas({ inicio: '', fim: '2026-01-01' })).toBe(false)
  })
})

describe('Orientações visíveis ao docente (D-27)', () => {
  const lista = [
    { id: 1, docente_id: 10, discente_id: 1 }, // orientação principal dele
    { id: 2, docente_id: 10, discente_id: 2 }, // coorientação dele
    { id: 3, docente_id: 20, discente_id: 1 }, // de outro docente
    { id: 4, docente_id: null, discente_id: 3 },
  ]

  it('docente vê só as próprias orientações e coorientações (docente_id dele)', () => {
    expect(filtrarOrientacoesDoDocente(lista, 10).map((o) => o.id)).toEqual([1, 2])
  })

  it('docente sem cadastro vinculado não vê nenhuma', () => {
    expect(filtrarOrientacoesDoDocente(lista, null)).toEqual([])
    expect(filtrarOrientacoesDoDocente(lista, undefined)).toEqual([])
  })

  it('não altera a lista original', () => {
    const copia = [...lista]
    filtrarOrientacoesDoDocente(lista, 10)
    expect(lista).toEqual(copia)
  })
})
