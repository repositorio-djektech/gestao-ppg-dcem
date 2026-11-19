import { describe, it, expect } from 'vitest'
import { anoDoValor, normalizarCamposAno } from './ano'

describe('Campos só com o ano (D-28: egressos e eventos)', () => {
  it('lê o ano de qualquer formato legado', () => {
    expect(anoDoValor('2025')).toBe('2025')
    expect(anoDoValor('2025-03-15')).toBe('2025')
    expect(anoDoValor('2025-03')).toBe('2025')
    expect(anoDoValor('15/03/2025')).toBe('2025')
    expect(anoDoValor('03/2025')).toBe('2025')
    expect(anoDoValor(2025)).toBe('2025')
    expect(anoDoValor(' 2025 ')).toBe('2025')
  })

  it('sem ano reconhecível devolve null', () => {
    expect(anoDoValor('')).toBeNull()
    expect(anoDoValor(null)).toBeNull()
    expect(anoDoValor(undefined)).toBeNull()
    expect(anoDoValor('Atual')).toBeNull()
    expect(anoDoValor(12)).toBeNull()
  })

  it('normalizarCamposAno grava só o ano e não apaga valores sem ano', () => {
    const r = normalizarCamposAno(
      { inicio: '2025-03-15', fim: 'Atual', ano_titulacao: 2024, outro: '01/01/2020' },
      ['inicio', 'fim', 'ano_titulacao'],
    )
    expect(r).toEqual({ inicio: '2025', fim: 'Atual', ano_titulacao: 2024, outro: '01/01/2020' })
  })
})
