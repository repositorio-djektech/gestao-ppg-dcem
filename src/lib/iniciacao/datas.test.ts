import { describe, it, expect } from 'vitest'
import { aplicarInicioNoForm } from './datas'

describe('datas da iniciação (H-31)', () => {
  it('o início em mês/ano define o ano do plano', () => {
    expect(aplicarInicioNoForm({ ano: 2020, fim: '' }, '2026-03')).toEqual({
      ano: 2026,
      fim: '',
      inicio: '2026-03',
    })
  })
  it('início limpo ou inválido mantém o ano que já estava', () => {
    expect(aplicarInicioNoForm({ ano: 2024 }, '').ano).toBe(2024)
    expect(aplicarInicioNoForm({ ano: 2024 }, 'abc').ano).toBe(2024)
  })
  it('só o ano (data antiga) também vira o ano do plano', () => {
    expect(aplicarInicioNoForm({ ano: 2020 }, '2027').ano).toBe(2027)
  })
})
