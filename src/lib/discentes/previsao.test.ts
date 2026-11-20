import { describe, it, expect } from 'vitest'
import { aplicarSugestaoConclusao } from './previsao'

const hoje = new Date(2026, 10, 20) // nov/2026

describe('aplicarSugestaoConclusao (D-34)', () => {
  const base = {
    tipo_curso: 'Mestrado',
    data_ingresso: '',
    ano_conclusao: '',
    status: 'em_andamento',
  }

  it('ingresso + curso preenchem a conclusão prevista e o status segue em andamento', () => {
    const r = aplicarSugestaoConclusao(base, { ...base, data_ingresso: '2026-03' }, hoje)
    expect(r.ano_conclusao).toBe('2028-02')
    expect(r.status).toBe('em_andamento')
  })

  it('ingresso antigo: a previsão já passada vira Titulado (conclui no mês do término)', () => {
    const r = aplicarSugestaoConclusao(base, { ...base, data_ingresso: '2023-03' }, hoje)
    expect(r.ano_conclusao).toBe('2025-02')
    expect(r.status).toBe('titulado')
  })

  it('prorrogação digitada não é sobrescrita ao mudar o ingresso', () => {
    const antes = { ...base, data_ingresso: '2026-03', ano_conclusao: '2028-08' }
    const r = aplicarSugestaoConclusao(antes, { ...antes, data_ingresso: '2026-04' }, hoje)
    expect(r.ano_conclusao).toBe('2028-08')
  })

  it('trocar para doutorado refaz a sugestão enquanto ela não foi alterada', () => {
    const antes = { ...base, data_ingresso: '2026-03', ano_conclusao: '2028-02' }
    const r = aplicarSugestaoConclusao(antes, { ...antes, tipo_curso: 'Doutorado' }, hoje)
    expect(r.ano_conclusao).toBe('2030-02')
  })

  it('desligado continua desligado', () => {
    const antes = { ...base, status: 'desligado' }
    const r = aplicarSugestaoConclusao(antes, { ...antes, data_ingresso: '2023-03' }, hoje)
    expect(r.status).toBe('desligado')
  })
})
