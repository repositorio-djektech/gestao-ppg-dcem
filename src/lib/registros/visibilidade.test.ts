import { describe, it, expect } from 'vitest'
import { registrosVisiveisAoDocente } from './visibilidade'

// Dados fictícios: patentes (chave patente_id)
const patentes = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
const vinculos = [
  { patente_id: 1, docente_id: 10 },
  { patente_id: 2, docente_id: 10 },
  { patente_id: 2, docente_id: 20 },
  { patente_id: 3, docente_id: 20 },
]

describe('Registros visíveis ao docente por tabela de vínculo (patentes e produção técnica, D-27)', () => {
  it('vê só os vinculados a ele, inclusive os compartilhados com outros docentes', () => {
    expect(
      registrosVisiveisAoDocente(patentes, 10, vinculos, 'patente_id').map((p) => p.id),
    ).toEqual([1, 2])
    expect(
      registrosVisiveisAoDocente(patentes, 20, vinculos, 'patente_id').map((p) => p.id),
    ).toEqual([2, 3])
  })

  it('registro sem vínculo (os já existentes antes da migração) não aparece para o docente', () => {
    expect(
      registrosVisiveisAoDocente(patentes, 10, vinculos, 'patente_id').map((p) => p.id),
    ).not.toContain(4)
  })

  it('funciona com outra chave (produção técnica)', () => {
    const producoes = [{ id: 7 }, { id: 8 }]
    const v = [{ producao_tecnica_id: 7, docente_id: 10 }]
    expect(
      registrosVisiveisAoDocente(producoes, 10, v, 'producao_tecnica_id').map((p) => p.id),
    ).toEqual([7])
  })

  it('docente sem cadastro vinculado, ou sem vínculos carregados, não vê nada', () => {
    expect(registrosVisiveisAoDocente(patentes, null, vinculos, 'patente_id')).toEqual([])
    expect(registrosVisiveisAoDocente(patentes, 10, [], 'patente_id')).toEqual([])
  })
})
