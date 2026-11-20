import { describe, it, expect } from 'vitest'
import { compararNomes, ordenarPorNome } from './ordenacao'

describe('ordem alfabética em português (P-35)', () => {
  it('ignora acento e maiúscula', () => {
    const nomes = ['Zélia Soares', 'Álvaro Dias', 'carla Lima', 'Ana Souza', 'Bruno Alves']
    expect(ordenarPorNome(nomes.map((nome) => ({ nome }))).map((n) => n.nome)).toEqual([
      'Álvaro Dias',
      'Ana Souza',
      'Bruno Alves',
      'carla Lima',
      'Zélia Soares',
    ])
  })
  it('não altera a lista original e aceita nome vazio ou nulo (vão para o começo)', () => {
    const original = [{ nome: 'B' }, { nome: null }, { nome: 'A' }, {}]
    const copia = ordenarPorNome(original)
    expect(original.map((o) => o.nome)).toEqual(['B', null, 'A', undefined])
    expect(copia[copia.length - 2].nome).toBe('A')
    expect(copia[copia.length - 1].nome).toBe('B')
  })
  it('compararNomes é estável para iguais e ignora espaços nas pontas', () => {
    expect(compararNomes('  Ana ', 'ana')).toBe(0)
    expect(compararNomes('Ana', 'Bia')).toBeLessThan(0)
  })
})
