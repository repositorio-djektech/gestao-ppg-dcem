import { describe, it, expect } from 'vitest'
import {
  MES_PADRAO,
  parseMesAno,
  normalizarMesAno,
  exibirMesAno,
  exibirPeriodoMesAno,
  anoDeMesAno,
  mesAnoAtingido,
  normalizarCamposMesAno,
} from './mes-ano'

describe('Mês e ano (D-29)', () => {
  it('o mês padrão é fevereiro', () => {
    expect(MES_PADRAO).toBe(2)
  })

  it('só o ano vira fevereiro daquele ano', () => {
    expect(normalizarMesAno('2025')).toBe('2025-02')
    expect(normalizarMesAno(2026)).toBe('2026-02')
    expect(exibirMesAno('2025')).toBe('02/2025')
    expect(parseMesAno('2025')).toEqual({ ano: 2025, mes: 2, mesPadrao: true })
  })

  it('formatos com mês mantêm o mês e descartam o dia', () => {
    expect(normalizarMesAno('2024-03')).toBe('2024-03')
    expect(normalizarMesAno('2024-03-15')).toBe('2024-03')
    expect(normalizarMesAno('08/2025')).toBe('2025-08')
    expect(normalizarMesAno('08-2025')).toBe('2025-08')
    expect(normalizarMesAno('05/02/2029')).toBe('2029-02')
    expect(parseMesAno('2024-03')?.mesPadrao).toBe(false)
  })

  it('exibe MM/AAAA', () => {
    expect(exibirMesAno('2024-03')).toBe('03/2024')
    expect(exibirMesAno('2025-11-30')).toBe('11/2025')
    expect(exibirMesAno('03/2024')).toBe('03/2024')
  })

  it('valores inválidos ou sem formato não são interpretados', () => {
    expect(parseMesAno('')).toBeNull()
    expect(parseMesAno(null)).toBeNull()
    expect(parseMesAno('Atual')).toBeNull()
    expect(parseMesAno('2025-13')).toBeNull()
    expect(parseMesAno('13/2025')).toBeNull()
    expect(parseMesAno('32/13/2024')).toBeNull()
    expect(parseMesAno('31/02/2024')).toBeNull()
    expect(parseMesAno('abc/2024')).toBeNull()
    expect(parseMesAno('99/99/9999')).toBeNull()
    expect(normalizarMesAno('Atual')).toBeNull()
  })

  it('texto sem formato sai como está na exibição; vazio vira null (traço)', () => {
    expect(exibirMesAno('Atual')).toBe('Atual')
    expect(exibirMesAno('')).toBeNull()
    expect(exibirMesAno(undefined)).toBeNull()
  })

  it('período', () => {
    expect(exibirPeriodoMesAno('2023-02', '2025-07')).toBe('02/2023 – 07/2025')
    expect(exibirPeriodoMesAno('2023', '')).toBe('02/2023')
    expect(exibirPeriodoMesAno('', '')).toBeNull()
    expect(exibirPeriodoMesAno('2022-02', 'Atual')).toBe('02/2022 – Atual')
  })

  it('ano do valor', () => {
    expect(anoDeMesAno('08/2025')).toBe(2025)
    expect(anoDeMesAno('Atual')).toBeNull()
  })

  it('o mês é atingido a partir do dia 1 (D-29): 11/2026 já vale em 19/11/2026', () => {
    const hoje = new Date(2026, 10, 19)
    expect(mesAnoAtingido('2026-11', hoje)).toBe(true)
    expect(mesAnoAtingido('2026-10', hoje)).toBe(true)
    expect(mesAnoAtingido('2026-12', hoje)).toBe(false)
    expect(mesAnoAtingido('2027-01', hoje)).toBe(false)
    expect(mesAnoAtingido('2025', hoje)).toBe(true) // fev/2025
    expect(mesAnoAtingido('2026', hoje)).toBe(true) // fev/2026 já passou
    expect(mesAnoAtingido('2027', hoje)).toBe(false)
    expect(mesAnoAtingido('Atual', hoje)).toBe(false)
    expect(mesAnoAtingido('', hoje)).toBe(false)
    // no dia 1º do mês
    expect(mesAnoAtingido('2026-12', new Date(2026, 11, 1))).toBe(true)
    expect(mesAnoAtingido('2026-12', new Date(2026, 10, 30))).toBe(false)
  })

  it('normalizarCamposMesAno converte valores antigos e não toca texto sem formato', () => {
    const r = normalizarCamposMesAno(
      { inicio: '2025', fim: 'Atual', outro: '2020', ingresso: '08/2025' },
      ['inicio', 'fim', 'ingresso'],
    )
    expect(r).toEqual({ inicio: '2025-02', fim: 'Atual', outro: '2020', ingresso: '2025-08' })
  })
})
