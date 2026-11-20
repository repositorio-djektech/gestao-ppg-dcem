import { describe, it, expect } from 'vitest'
import { precisaAtribuicao, docenteAtribuidoValido } from './atribuicao'

describe('atribuição da publicação a um só docente (§7º)', () => {
  it('só há o que atribuir com dois ou mais docentes autores (repetidos não contam)', () => {
    expect(precisaAtribuicao([])).toBe(false)
    expect(precisaAtribuicao([1])).toBe(false)
    expect(precisaAtribuicao([1, 1])).toBe(false)
    expect(precisaAtribuicao([1, 2])).toBe(true)
  })
  it('a indicação vale se o escolhido é um dos autores; senão vira null', () => {
    expect(docenteAtribuidoValido(2, [1, 2])).toBe(2)
    expect(docenteAtribuidoValido('2', [1, 2])).toBe(2)
    expect(docenteAtribuidoValido(3, [1, 2])).toBeNull() // saiu da lista
    expect(docenteAtribuidoValido(1, [1])).toBeNull() // só um autor: não há atribuição
    expect(docenteAtribuidoValido(null, [1, 2])).toBeNull()
    expect(docenteAtribuidoValido('', [1, 2])).toBeNull()
  })
})
