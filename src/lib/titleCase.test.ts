import { describe, it, expect } from 'vitest'
import { toTitleCase } from './titleCase'

describe('toTitleCase', () => {
  it('converte textos em caixa alta preservando siglas conhecidas', () => {
    expect(toTitleCase('UNIVERSIDADE FEDERAL DE SERGIPE - AGITTE')).toBe(
      'Universidade Federal de Sergipe - AGITTE',
    )
  })

  it('mantém siglas isoladas ou acrônimos em maiúsculas', () => {
    expect(toTitleCase('CAPES')).toBe('CAPES')
    expect(toTitleCase('ABCM')).toBe('ABCM')
    expect(toTitleCase('UFSC')).toBe('UFSC')
    expect(toTitleCase('CNPq')).toBe('CNPq')
  })

  it('preserva conectivos e preposições em minúsculas no meio da frase', () => {
    const input = '3º LUGAR DA ÁREA DE CIÊNCIAS EXATAS E DA TERRA NO 18º EIDTI'
    expect(toTitleCase(input)).toBe('3º Lugar da Área de Ciências Exatas e da Terra no 18º EIDTI')
  })

  it('capitaliza conectivo se for a primeira palavra do texto', () => {
    expect(toTitleCase('de volta ao futuro')).toBe('De Volta ao Futuro')
  })

  it('capitaliza conectivo após pontuação forte (: ou -)', () => {
    expect(toTitleCase('Premiação: o melhor do ano')).toBe('Premiação: O Melhor do Ano')
  })

  it('capitaliza após hífens', () => {
    expect(toTitleCase('sudeste-brasileiro')).toBe('Sudeste-Brasileiro')
  })

  it('preserva numerais romanos', () => {
    expect(toTitleCase('Prêmio CAPES de Tese - Engenharias II')).toBe(
      'Prêmio CAPES de Tese - Engenharias II',
    )
  })

  it('preserva acentuação em maiúsculas e minúsculas', () => {
    expect(toTitleCase('MENÇÃO HONROSA - CONGRESSO BRASILEIRO DE ENGENHARIA')).toBe(
      'Menção Honrosa - Congresso Brasileiro de Engenharia',
    )
  })

  it('retorna string vazia para valores nulos ou vazios', () => {
    expect(toTitleCase(null)).toBe('')
    expect(toTitleCase(undefined)).toBe('')
    expect(toTitleCase('')).toBe('')
    expect(toTitleCase('   ')).toBe('')
  })
})
