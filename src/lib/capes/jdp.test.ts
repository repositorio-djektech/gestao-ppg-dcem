import { describe, it, expect } from 'vitest'
import { avaliarStatusJdpDocente, calcularResumoJdpPrograma } from './jdp'
import type { Docente } from '@/types/database'

describe('Regras de JDP (Jovem Doutor Pesquisador)', () => {
  const anoReferencia = 2025

  it('deve identificar docente não-JDP', () => {
    const status = avaliarStatusJdpDocente(
      { jdp: false, categoria: 'permanente', jdp_desde: null, ano_doutorado: null },
      anoReferencia,
    )
    expect(status.isJdp).toBe(false)
    expect(status.isValido).toBe(false)
    expect(status.isExpirado).toBe(false)
  })

  it('deve considerar válido JDP com doutorado há 4 anos e início há 1 ano', () => {
    const status = avaliarStatusJdpDocente(
      { jdp: true, categoria: 'permanente', jdp_desde: 2024, ano_doutorado: 2021 },
      anoReferencia,
    )
    expect(status.isJdp).toBe(true)
    expect(status.isValido).toBe(true)
    expect(status.isExpirado).toBe(false)
  })

  it('deve marcar como expirado quando jdp_desde + 4 < ano_corrente (ex: início em 2020)', () => {
    // 2020 + 4 = 2024 < 2025 -> expirou
    const status = avaliarStatusJdpDocente(
      { jdp: true, categoria: 'permanente', jdp_desde: 2020, ano_doutorado: 2019 },
      anoReferencia,
    )
    expect(status.expiradoPorPrazoJdp).toBe(true)
    expect(status.isExpirado).toBe(true)
    expect(status.isValido).toBe(false)
    expect(status.motivoExpiracao).toContain('desde 2020')
  })

  it('deve marcar como expirado quando ano_doutorado + 10 < ano_corrente (ex: doutorado em 2014)', () => {
    // 2014 + 10 = 2024 < 2025 -> expirou
    const status = avaliarStatusJdpDocente(
      { jdp: true, categoria: 'permanente', jdp_desde: 2023, ano_doutorado: 2014 },
      anoReferencia,
    )
    expect(status.expiradoPorDoutorado).toBe(true)
    expect(status.isExpirado).toBe(true)
    expect(status.isValido).toBe(false)
  })

  it('não deve considerar válido JDP sem categoria permanente', () => {
    const status = avaliarStatusJdpDocente(
      { jdp: true, categoria: 'colaborador', jdp_desde: 2024, ano_doutorado: 2022 },
      anoReferencia,
    )
    expect(status.isJdp).toBe(true)
    expect(status.isPermanente).toBe(false)
    expect(status.isValido).toBe(false)
  })

  it('calcula métricas do programa e limite de 20% do DP', () => {
    const docentes: Docente[] = [
      // 5 permanentes
      {
        id: 1,
        nome: 'P1',
        categoria: 'permanente',
        jdp: true,
        jdp_desde: 2024,
        ano_doutorado: 2022,
      } as any,
      {
        id: 2,
        nome: 'P2',
        categoria: 'permanente',
        jdp: true,
        jdp_desde: 2023,
        ano_doutorado: 2021,
      } as any,
      { id: 3, nome: 'P3', categoria: 'permanente', jdp: false } as any,
      { id: 4, nome: 'P4', categoria: 'permanente', jdp: false } as any,
      { id: 5, nome: 'P5', categoria: 'permanente', jdp: false } as any,
      // 1 colaborador com JDP marcado (inválido por regra)
      {
        id: 6,
        nome: 'C1',
        categoria: 'colaborador',
        jdp: true,
        jdp_desde: 2024,
        ano_doutorado: 2022,
      } as any,
    ]

    const resumo = calcularResumoJdpPrograma(docentes, anoReferencia)
    expect(resumo.totalPermanentes).toBe(5)
    expect(resumo.limiteMaximoJdp).toBe(1) // floor(5 * 0.2) = 1
    expect(resumo.totalJdpValidos).toBe(2) // P1 e P2 (C1 não é permanente)
    expect(resumo.excedeLimite20Porcento).toBe(true) // 2 > 1
  })
})
