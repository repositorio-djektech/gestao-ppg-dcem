import { describe, it, expect } from 'vitest'
import { discentesVisiveisAoDocente } from './visibilidade'

// Dados fictícios.
const DOCENTE = 10
const OUTRO = 20
const discentes = [
  { id: 1, nome: 'Orientado por mim', docente_orientador_id: DOCENTE },
  { id: 2, nome: 'Orientado por outro, eu coorientador', docente_orientador_id: OUTRO },
  { id: 3, nome: 'Orientado por outro, sem relação', docente_orientador_id: OUTRO },
  { id: 4, nome: 'Sem orientador', docente_orientador_id: null },
  { id: 5, nome: 'Sem orientador (campo ausente)' },
  { id: 6, nome: 'Orientador zero', docente_orientador_id: 0 },
]

describe('Discentes visíveis ao docente', () => {
  it('vê os que orienta, os que coorienta e os sem orientador (para poder assumir)', () => {
    const ids = discentesVisiveisAoDocente(discentes, DOCENTE, [2]).map((d) => d.id)
    expect(ids).toEqual([1, 2, 4, 5, 6])
  })

  it('NÃO vê discente orientado por outro docente sem vínculo com ele', () => {
    const ids = discentesVisiveisAoDocente(discentes, DOCENTE, []).map((d) => d.id)
    expect(ids).not.toContain(3)
    expect(ids).not.toContain(2)
  })

  it('coorientação vem das orientações do próprio docente (aceita Set)', () => {
    const ids = discentesVisiveisAoDocente(discentes, DOCENTE, new Set([3])).map((d) => d.id)
    expect(ids).toContain(3)
  })

  it('docente sem cadastro vinculado não vê nada (nunca "vê tudo")', () => {
    expect(discentesVisiveisAoDocente(discentes, null, [2])).toEqual([])
    expect(discentesVisiveisAoDocente(discentes, undefined, [2])).toEqual([])
  })

  it('não altera a lista original', () => {
    const copia = [...discentes]
    discentesVisiveisAoDocente(discentes, DOCENTE, [])
    expect(discentes).toEqual(copia)
  })
})
