import { describe, it, expect } from 'vitest'
import { mapaIngressoPorDiscente, aplicarDiscenteNoForm } from './inicio'

describe('Início da orientação vem do ingresso do discente (D-29)', () => {
  const discentes = [
    { id: 1, data_ingresso: '2023' }, // só ano: fevereiro
    { id: 2, data_ingresso: '2024-03-15' }, // formato antigo
    { id: 3, data_ingresso: '08/2025' }, // formato antigo
    { id: 4, data_ingresso: '' },
    { id: 5, data_ingresso: null },
  ]
  const mapa = mapaIngressoPorDiscente(discentes)

  it('mapa guarda mês e ano (só ano vira fevereiro), e só de quem tem ingresso', () => {
    expect(mapa).toEqual({ '1': '2023-02', '2': '2024-03', '3': '2025-08' })
  })

  it('ao escolher o discente, o início assume o mês e ano de ingresso (mesmo de formato antigo)', () => {
    const base = { tipo: 'Mestrado', docente_id: '10', discente_id: '', inicio: '' }
    expect(aplicarDiscenteNoForm(base, '1', mapa)).toMatchObject({
      discente_id: '1',
      inicio: '2023-02',
    })
    expect(aplicarDiscenteNoForm(base, '2', mapa).inicio).toBe('2024-03')
    expect(aplicarDiscenteNoForm(base, '3', mapa).inicio).toBe('2025-08')
  })

  it('preserva tipo e docente já escolhidos', () => {
    const base = { tipo: 'Doutorado', docente_id: '10', discente_id: '', inicio: '' }
    expect(aplicarDiscenteNoForm(base, '1', mapa)).toMatchObject({
      tipo: 'Doutorado',
      docente_id: '10',
    })
  })

  it('discente sem ingresso não apaga o início que já estava preenchido', () => {
    const base = { discente_id: '1', inicio: '2020-05' }
    expect(aplicarDiscenteNoForm(base, '4', mapa)).toMatchObject({
      discente_id: '4',
      inicio: '2020-05',
    })
    expect(aplicarDiscenteNoForm(base, '5', mapa).inicio).toBe('2020-05')
  })

  it('trocar para outro discente com ingresso atualiza o início', () => {
    const base = { discente_id: '1', inicio: '2023-02' }
    expect(aplicarDiscenteNoForm(base, '2', mapa).inicio).toBe('2024-03')
  })
})
