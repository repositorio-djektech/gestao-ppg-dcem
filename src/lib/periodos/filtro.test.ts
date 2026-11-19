import { describe, it, expect } from 'vitest'
import {
  lerFiltroPeriodo,
  discenteNoPeriodo,
  egressoNoPeriodo,
  docentesComAtividadeNoPeriodo,
} from './filtro'

const f = (a: number, b: number) => ({ anoInicio: a, anoFim: b })

describe('lerFiltroPeriodo', () => {
  it('vazio = sem filtro', () => {
    expect(lerFiltroPeriodo('', '')).toEqual({ filtro: null, erro: null })
  })
  it('aceita intervalo e extremos abertos', () => {
    expect(lerFiltroPeriodo('2021', '2023').filtro).toEqual(f(2021, 2023))
    expect(lerFiltroPeriodo('2021', '').filtro?.anoFim).toBe(Number.POSITIVE_INFINITY)
    expect(lerFiltroPeriodo('', '2023').filtro?.anoInicio).toBe(Number.NEGATIVE_INFINITY)
  })
  it('recusa início maior que fim e texto', () => {
    expect(lerFiltroPeriodo('2024', '2022').erro).toMatch(/maior/)
    expect(lerFiltroPeriodo('abc', '').erro).toBeTruthy()
  })
})

describe('discenteNoPeriodo', () => {
  const periodo = f(2021, 2023)
  it('sem filtro tudo passa', () => {
    expect(discenteNoPeriodo({ data_ingresso: '2030-02' }, null)).toBe(true)
  })
  it('ingressou antes e sem conclusão (em aberto) entra', () => {
    expect(discenteNoPeriodo({ data_ingresso: '2019-03' }, periodo)).toBe(true)
  })
  it('concluiu antes do período fica de fora; no ano de início entra', () => {
    expect(discenteNoPeriodo({ data_ingresso: '2018-03', ano_conclusao: '2020-12' }, periodo)).toBe(
      false,
    )
    expect(discenteNoPeriodo({ data_ingresso: '2018-03', ano_conclusao: '2021-01' }, periodo)).toBe(
      true,
    )
  })
  it('ingressou depois do fim fica de fora; no ano final entra', () => {
    expect(discenteNoPeriodo({ data_ingresso: '2024-02' }, periodo)).toBe(false)
    expect(discenteNoPeriodo({ data_ingresso: '2023-12' }, periodo)).toBe(true)
  })
  it('aceita ingresso em data completa legada e conclusão pela data antiga', () => {
    expect(discenteNoPeriodo({ data_ingresso: '2022-05-10' }, periodo)).toBe(true)
    expect(
      discenteNoPeriodo({ data_ingresso: '2015-01-01', data_conclusao: '2018-06-30' }, periodo),
    ).toBe(false)
  })
  it('sem datas não é cortado', () => {
    expect(discenteNoPeriodo({}, periodo)).toBe(true)
  })
})

describe('egressoNoPeriodo', () => {
  const periodo = f(2021, 2023)
  it('usa o ano de titulação (número ou texto), bordas inclusas', () => {
    expect(egressoNoPeriodo({ ano_titulacao: 2021 }, periodo)).toBe(true)
    expect(egressoNoPeriodo({ ano_titulacao: '2023' }, periodo)).toBe(true)
    expect(egressoNoPeriodo({ ano_titulacao: 2020 }, periodo)).toBe(false)
    expect(egressoNoPeriodo({ ano_titulacao: 2024 }, periodo)).toBe(false)
  })
  it('sem ano fica de fora quando há filtro', () => {
    expect(egressoNoPeriodo({ ano_titulacao: null }, periodo)).toBe(false)
    expect(egressoNoPeriodo({ ano_titulacao: null }, null)).toBe(true)
  })
})

describe('docentesComAtividadeNoPeriodo', () => {
  const dados = {
    publicacoes: [
      { id: 1, ano: 2022 },
      { id: 2, ano: 2026 },
    ],
    publicacoesDocentes: [
      { publicacao_id: 1, docente_id: 10 },
      { publicacao_id: 2, docente_id: 11 },
    ],
    orientacoes: [
      { docente_id: 12, inicio: '2019-02', fim: '2021-12' },
      { docente_id: 13, inicio: '2024-02', fim: '2025-12' },
      { docente_id: 14, inicio: '2020-02', fim: '' },
    ],
    projetos: [
      { id: 1, coordenador_id: 15, inicio: '2022-03', fim: '2023-03' },
      { id: 2, coordenador_id: 16, inicio: '2026-03', fim: '' },
    ],
    participantes: [
      { projeto_id: 1, docente_id: 17 },
      { projeto_id: 2, docente_id: 18 },
    ],
  }
  it('sem filtro devolve null (todos)', () => {
    expect(docentesComAtividadeNoPeriodo(dados, null)).toBeNull()
  })
  it('junta publicação, orientação e projeto que cruzam o período', () => {
    const ativos = docentesComAtividadeNoPeriodo(dados, f(2021, 2023))!
    expect([...ativos].sort((a, b) => a - b)).toEqual([10, 12, 14, 15, 17])
  })
})
