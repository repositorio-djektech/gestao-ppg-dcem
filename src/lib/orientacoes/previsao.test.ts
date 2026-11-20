import { describe, it, expect } from 'vitest'
import { sugerirTermino, aplicarSugestaoTermino, DURACAO_MESES } from './previsao'

describe('sugerirTermino (D-34)', () => {
  it('mestrado: março/2026 → fevereiro/2028 (24 meses)', () => {
    expect(sugerirTermino('Mestrado', '2026-03')).toBe('2028-02')
  })
  it('doutorado: março/2026 → fevereiro/2030 (48 meses)', () => {
    expect(sugerirTermino('Doutorado', '2026-03')).toBe('2030-02')
  })
  it('vira o ano corretamente (início em janeiro e em dezembro)', () => {
    expect(sugerirTermino('Mestrado', '2026-01')).toBe('2027-12')
    expect(sugerirTermino('Mestrado', '2026-12')).toBe('2028-11')
  })
  it('início só com ano vale como fevereiro (D-29)', () => {
    expect(sugerirTermino('Mestrado', '2026')).toBe('2028-01')
  })
  it('só mestrado e doutorado; início inválido não sugere', () => {
    expect(sugerirTermino('Iniciação Científica', '2026-03')).toBeNull()
    expect(sugerirTermino('Mestrado', '')).toBeNull()
    expect(sugerirTermino('Mestrado', 'abc')).toBeNull()
    expect(DURACAO_MESES).toEqual({ Mestrado: 24, Doutorado: 48 })
  })
})

describe('aplicarSugestaoTermino', () => {
  it('preenche o término vazio quando o início é informado', () => {
    const antes = { tipo: 'Mestrado', inicio: '', fim: '' }
    const depois = aplicarSugestaoTermino(antes, { ...antes, inicio: '2026-03' })
    expect(depois.fim).toBe('2028-02')
  })
  it('acompanha a mudança de início enquanto o término ainda é a sugestão', () => {
    const antes = { tipo: 'Mestrado', inicio: '2026-03', fim: '2028-02' }
    expect(aplicarSugestaoTermino(antes, { ...antes, inicio: '2026-08' }).fim).toBe('2028-07')
  })
  it('acompanha a troca de mestrado para doutorado', () => {
    const antes = { tipo: 'Mestrado', inicio: '2026-03', fim: '2028-02' }
    expect(aplicarSugestaoTermino(antes, { ...antes, tipo: 'Doutorado' }).fim).toBe('2030-02')
  })
  it('término digitado à mão (prorrogação) nunca é sobrescrito', () => {
    const antes = { tipo: 'Mestrado', inicio: '2026-03', fim: '2028-08' }
    expect(aplicarSugestaoTermino(antes, { ...antes, inicio: '2026-04' }).fim).toBe('2028-08')
  })
  it('virar iniciação limpa só a sugestão antiga', () => {
    const antes = { tipo: 'Mestrado', inicio: '2026-03', fim: '2028-02' }
    expect(aplicarSugestaoTermino(antes, { ...antes, tipo: 'Iniciação Científica' }).fim).toBe('')
    const manual = { tipo: 'Mestrado', inicio: '2026-03', fim: '2028-08' }
    expect(aplicarSugestaoTermino(manual, { ...manual, tipo: 'Iniciação Científica' }).fim).toBe(
      '2028-08',
    )
  })
})
