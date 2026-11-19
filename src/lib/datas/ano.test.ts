import { describe, it, expect } from 'vitest'
import {
  anoDoValor,
  anoNumero,
  exibirAno,
  exibirPeriodoAnos,
  anoJaPassou,
  normalizarCamposAno,
} from './ano'

describe('Datas só com o ano (D-28)', () => {
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
    expect(anoNumero('Atual')).toBeNull()
    expect(anoNumero('03/2026')).toBe(2026)
  })

  it('exibirAno mostra só o ano; sem ano mostra o texto; vazio vira null (traço)', () => {
    expect(exibirAno('2025-03-15')).toBe('2025')
    expect(exibirAno('Atual')).toBe('Atual')
    expect(exibirAno('')).toBeNull()
    expect(exibirAno(null)).toBeNull()
  })

  it('exibirPeriodoAnos', () => {
    expect(exibirPeriodoAnos('2023-02-01', '2025')).toBe('2023 – 2025')
    expect(exibirPeriodoAnos('2023', '')).toBe('2023')
    expect(exibirPeriodoAnos('', '')).toBeNull()
    expect(exibirPeriodoAnos('2022', 'Atual')).toBe('2022 – Atual')
  })

  it('o ano só passa em 31/12: anterior ao atual passou; atual e futuro não', () => {
    const hoje = new Date(2026, 10, 19)
    expect(anoJaPassou(2025, hoje)).toBe(true)
    expect(anoJaPassou(2026, hoje)).toBe(false)
    expect(anoJaPassou(2027, hoje)).toBe(false)
    expect(anoJaPassou(null, hoje)).toBe(false)
    // virada: em 1º/1/2027 o ano de 2026 passou
    expect(anoJaPassou(2026, new Date(2027, 0, 1))).toBe(true)
  })

  it('normalizarCamposAno grava só o ano e não apaga valores sem ano', () => {
    const r = normalizarCamposAno(
      { inicio: '2025-03-15', fim: 'Atual', ano_titulacao: 2024, outro: '01/01/2020' },
      ['inicio', 'fim', 'ano_titulacao'],
    )
    expect(r).toEqual({ inicio: '2025', fim: 'Atual', ano_titulacao: 2024, outro: '01/01/2020' })
  })
})
