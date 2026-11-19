import { describe, it, expect } from 'vitest'
import {
  PERIODO_PADRAO,
  CONFIGURACAO_PADRAO,
  anosDoPeriodo,
  anoReferenciaDoPeriodo,
  rotuloPeriodo,
  validarPeriodo,
  validarConfiguracao,
  janelaLattes,
  periodoDeLinha,
  configuracaoDeLinha,
} from './periodo'

describe('Períodos de avaliação configuráveis (D-32)', () => {
  it('o padrão é o quadriênio 2025–2028 e a janela do Lattes desde 2020', () => {
    expect(PERIODO_PADRAO).toMatchObject({ anoInicio: 2025, anoFim: 2028, ativo: true })
    expect(rotuloPeriodo(PERIODO_PADRAO)).toBe('2025–2028')
    expect(CONFIGURACAO_PADRAO).toEqual({ lattesAnoInicio: 2020, lattesAnoFim: null })
  })

  it('anos do período: 4 anos (2025–2028) e 3 anos (2029–2031)', () => {
    expect(anosDoPeriodo({ anoInicio: 2025, anoFim: 2028 })).toEqual([2025, 2026, 2027, 2028])
    expect(anosDoPeriodo({ anoInicio: 2029, anoFim: 2031 })).toEqual([2029, 2030, 2031])
  })

  describe('ano de referência', () => {
    const p = { anoInicio: 2025, anoFim: 2028, anoReferencia: null }
    it('dentro do período: o ano corrente', () => {
      expect(anoReferenciaDoPeriodo(p, new Date(2026, 10, 20))).toBe(2026)
    })
    it('período já encerrado: o último ano (tudo calculado)', () => {
      expect(anoReferenciaDoPeriodo(p, new Date(2031, 0, 1))).toBe(2028)
    })
    it('período futuro: o primeiro ano (não trata o período inteiro como "futuro")', () => {
      expect(
        anoReferenciaDoPeriodo(
          { anoInicio: 2029, anoFim: 2031, anoReferencia: null },
          new Date(2026, 10, 20),
        ),
      ).toBe(2029)
    })
    it('o ano de referência definido no período prevalece', () => {
      expect(anoReferenciaDoPeriodo({ ...p, anoReferencia: 2027 }, new Date(2026, 10, 20))).toBe(
        2027,
      )
    })
  })

  describe('validação do período', () => {
    const ok = { nome: 'Quadriênio 2029–2031', anoInicio: 2029, anoFim: 2031 }
    it('aceita 3 anos e 4 anos', () => {
      expect(validarPeriodo(ok)).toBeNull()
      expect(validarPeriodo({ ...ok, anoFim: 2032 })).toBeNull()
    })
    it('recusa nome vazio, anos fora da faixa, invertidos ou longos demais', () => {
      expect(validarPeriodo({ ...ok, nome: '  ' })).toMatch(/nome/i)
      expect(validarPeriodo({ ...ok, anoInicio: NaN })).toMatch(/ano inicial/i)
      expect(validarPeriodo({ ...ok, anoInicio: 1980 })).toMatch(/entre/i)
      expect(validarPeriodo({ ...ok, anoInicio: 2032, anoFim: 2029 })).toMatch(/maior/i)
      expect(validarPeriodo({ ...ok, anoInicio: 2020, anoFim: 2035 })).toMatch(/máximo/i)
      expect(validarPeriodo({ ...ok, anoReferencia: 1900 })).toMatch(/referência/i)
    })
  })

  describe('janela do Lattes', () => {
    it('padrão: desde 2020 até o fim do período ou o ano atual (o maior)', () => {
      const periodo = { anoFim: 2028 }
      expect(janelaLattes(CONFIGURACAO_PADRAO, periodo, new Date(2026, 5, 1))).toEqual({
        anoInicio: 2020,
        anoFim: 2028,
      })
      expect(janelaLattes(CONFIGURACAO_PADRAO, periodo, new Date(2030, 0, 1))).toEqual({
        anoInicio: 2020,
        anoFim: 2030,
      })
    })
    it('ano final configurado prevalece', () => {
      expect(
        janelaLattes(
          { lattesAnoInicio: 2021, lattesAnoFim: 2024 },
          { anoFim: 2028 },
          new Date(2026, 5, 1),
        ),
      ).toEqual({ anoInicio: 2021, anoFim: 2024 })
    })
    it('valida a configuração', () => {
      expect(validarConfiguracao({ lattesAnoInicio: 2020, lattesAnoFim: null })).toBeNull()
      expect(validarConfiguracao({ lattesAnoInicio: 2020, lattesAnoFim: 2024 })).toBeNull()
      expect(validarConfiguracao({ lattesAnoInicio: NaN, lattesAnoFim: null })).toMatch(
        /ano inicial/i,
      )
      expect(validarConfiguracao({ lattesAnoInicio: 1900, lattesAnoFim: null })).toMatch(/entre/i)
      expect(validarConfiguracao({ lattesAnoInicio: 2024, lattesAnoFim: 2020 })).toMatch(/menor/i)
    })
  })

  it('converte as linhas do banco', () => {
    expect(
      periodoDeLinha({
        id: 3,
        nome: 'P',
        ano_inicio: 2029,
        ano_fim: 2031,
        ativo: false,
        ano_referencia: null,
      }),
    ).toEqual({
      id: 3,
      nome: 'P',
      anoInicio: 2029,
      anoFim: 2031,
      ativo: false,
      anoReferencia: null,
    })
    expect(configuracaoDeLinha({ lattes_ano_inicio: 2020 })).toEqual({
      lattesAnoInicio: 2020,
      lattesAnoFim: null,
    })
  })
})
