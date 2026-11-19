import { describe, it, expect } from 'vitest'
import { comporLocalAno, separarLocalAno, exibirLocalAno } from './local-ano'

describe('Evento: local e ano (D-28)', () => {
  it('compõe "Local - AAAA"; sem local, só o ano; sem ano, só o local', () => {
    expect(comporLocalAno('São Paulo, SP', '2025')).toBe('São Paulo, SP - 2025')
    expect(comporLocalAno('', '2025')).toBe('2025')
    expect(comporLocalAno('Recife, PE', '')).toBe('Recife, PE')
    expect(comporLocalAno('  ', null)).toBe('')
    // se vier uma data completa no lugar do ano, grava só o ano
    expect(comporLocalAno('Recife, PE', '2025-11-10')).toBe('Recife, PE - 2025')
  })

  it('separa o formato gravado (inclusive o do import do Lattes)', () => {
    expect(separarLocalAno('São Paulo, SP - 2025')).toEqual({ local: 'São Paulo, SP', ano: '2025' })
    expect(separarLocalAno('2025')).toEqual({ local: '', ano: '2025' })
    expect(separarLocalAno('Não informado')).toEqual({ local: 'Não informado', ano: '' })
    expect(separarLocalAno('')).toEqual({ local: '', ano: '' })
    expect(separarLocalAno(null)).toEqual({ local: '', ano: '' })
  })

  it('lê textos antigos em formato livre pelo ano e pelo trecho antes do travessão', () => {
    expect(separarLocalAno('São Paulo, SP — 10 a 14/11/2025')).toEqual({
      local: 'São Paulo, SP',
      ano: '2025',
    })
    expect(separarLocalAno('Natal, RN 2024')).toEqual({ local: 'Natal, RN', ano: '2024' })
    expect(separarLocalAno('Natal, RN, 2024')).toEqual({ local: 'Natal, RN', ano: '2024' })
  })

  it('exibirLocalAno padroniza a exibição; vazio vira null (traço)', () => {
    expect(exibirLocalAno('São Paulo, SP — 10 a 14/11/2025')).toBe('São Paulo, SP - 2025')
    expect(exibirLocalAno('Aracaju - 2025')).toBe('Aracaju - 2025')
    expect(exibirLocalAno('')).toBeNull()
  })

  it('ida e volta: separar o que foi composto devolve os mesmos campos', () => {
    const gravado = comporLocalAno('Aracaju, SE', '2026')
    expect(separarLocalAno(gravado)).toEqual({ local: 'Aracaju, SE', ano: '2026' })
  })
})
