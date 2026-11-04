import { describe, it, expect } from 'vitest'
import { projetosVisiveisAoDocente } from './visibilidade'

// Dados fictícios
const projetos = [
  { id: 1, titulo: 'Coordeno', coordenador_id: 10 },
  { id: 2, titulo: 'Participo', coordenador_id: 20 },
  { id: 3, titulo: 'Alheio', coordenador_id: 20 },
  { id: 4, titulo: 'Sem coordenador', coordenador_id: null },
]
const participacoes = [
  { projeto_id: 2, docente_id: 10 },
  { projeto_id: 3, docente_id: 30 },
]

describe('Projetos visíveis ao docente (D-27)', () => {
  it('vê os que coordena e os em que participa; não vê os demais', () => {
    expect(projetosVisiveisAoDocente(projetos, 10, participacoes).map((p) => p.id)).toEqual([1, 2])
  })

  it('só participações do próprio docente contam', () => {
    expect(projetosVisiveisAoDocente(projetos, 30, participacoes).map((p) => p.id)).toEqual([3])
  })

  it('docente sem cadastro vinculado não vê nenhum', () => {
    expect(projetosVisiveisAoDocente(projetos, null, participacoes)).toEqual([])
    expect(projetosVisiveisAoDocente(projetos, undefined, participacoes)).toEqual([])
  })

  it('não altera a lista original', () => {
    const copia = [...projetos]
    projetosVisiveisAoDocente(projetos, 10, participacoes)
    expect(projetos).toEqual(copia)
  })
})
