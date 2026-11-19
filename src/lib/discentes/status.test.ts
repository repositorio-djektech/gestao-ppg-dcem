import { describe, it, expect } from 'vitest'
import {
  statusEfetivoDiscente,
  rotuloStatusDiscente,
  STATUS_DISCENTE,
  aplicarConclusaoNoForm,
  prepararDiscenteParaGravar,
  conclusaoParaExibicao,
} from './status'

const HOJE = new Date(2026, 10, 19, 15, 30, 0) // 19/11/2026

describe('Status do discente a partir do mês e ano de conclusão (D-29)', () => {
  it('só existem três status: Em andamento, Titulado e Desligado', () => {
    expect(STATUS_DISCENTE).toEqual(['em_andamento', 'titulado', 'desligado'])
    expect(rotuloStatusDiscente('em_andamento')).toBe('Em andamento')
    expect(rotuloStatusDiscente('titulado')).toBe('Titulado')
    expect(rotuloStatusDiscente('desligado')).toBe('Desligado')
  })

  it('sem conclusão: em andamento', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: null }, HOJE)).toBe(
      'em_andamento',
    )
    expect(statusEfetivoDiscente({ status: 'ativo' }, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '' }, HOJE)).toBe(
      'em_andamento',
    )
    // status gravado como titulado, mas sem conclusão: não vale
    expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('mês futuro: em andamento (mesmo que o status gravado seja titulado)', () => {
    expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '2026-12' }, HOJE)).toBe(
      'em_andamento',
    )
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2027-03' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('o próprio mês da conclusão já é titulado (D-29)', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2026-11' }, HOJE)).toBe(
      'titulado',
    )
  })

  it('mês passado: titulado', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2026-09' }, HOJE)).toBe(
      'titulado',
    )
    expect(statusEfetivoDiscente({ status: 'concluido', ano_conclusao: '2024-06' }, HOJE)).toBe(
      'titulado',
    )
  })

  it('conclusão só com o ano (dado antigo) vale como fevereiro', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2026' }, HOJE)).toBe(
      'titulado',
    )
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2027' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('o status acompanha o passar do tempo (mês que era futuro vira atingido)', () => {
    const d = { status: 'em_andamento', ano_conclusao: '2026-12' }
    expect(statusEfetivoDiscente(d, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente(d, new Date(2026, 11, 1))).toBe('titulado')
  })

  it('desligado é manual e prevalece sobre a conclusão', () => {
    expect(statusEfetivoDiscente({ status: 'desligado', ano_conclusao: '2020-05' }, HOJE)).toBe(
      'desligado',
    )
    expect(statusEfetivoDiscente({ status: 'desligado' }, HOJE)).toBe('desligado')
  })

  it('valor inválido é tratado como sem conclusão', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: 'abc' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('registro antigo só com data_conclusao vale pelo mês dela; ano_conclusao vale mais', () => {
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2025-03-10' }, HOJE),
    ).toBe('titulado')
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2027-01-01' }, HOJE),
    ).toBe('em_andamento')
    expect(
      statusEfetivoDiscente(
        { status: 'titulado', ano_conclusao: '2027-05', data_conclusao: '2020-01-01' },
        HOJE,
      ),
    ).toBe('em_andamento')
  })
})

describe('Formulário de discente: conclusão e status', () => {
  it('ao informar mês passado o status do formulário vira titulado; futuro, em andamento', () => {
    const base = { nome: 'Discente Ficticio', status: 'em_andamento', ano_conclusao: '' }
    expect(aplicarConclusaoNoForm(base, '2025-03', HOJE).status).toBe('titulado')
    expect(aplicarConclusaoNoForm(base, '2027-03', HOJE).status).toBe('em_andamento')
    expect(aplicarConclusaoNoForm(base, '2025-03', HOJE).ano_conclusao).toBe('2025-03')
  })

  it('ao limpar a conclusão volta para em andamento', () => {
    const base = { status: 'titulado', ano_conclusao: '2025-03' }
    expect(aplicarConclusaoNoForm(base, '', HOJE).status).toBe('em_andamento')
  })

  it('desligado não é alterado pela conclusão', () => {
    const base = { status: 'desligado', ano_conclusao: '' }
    expect(aplicarConclusaoNoForm(base, '2025-03', HOJE).status).toBe('desligado')
  })

  it('a data antiga é descartada quando a conclusão muda', () => {
    const base = { status: 'em_andamento', ano_conclusao: '2025-03', data_conclusao: '2025-03-10' }
    expect(aplicarConclusaoNoForm(base, '2027-03', HOJE).data_conclusao).toBe('')
  })

  it('prepararDiscenteParaGravar: grava AAAA-MM, a data antiga vira null e o status é o efetivo', () => {
    const sem = prepararDiscenteParaGravar({ status: 'titulado', ano_conclusao: '' }, HOJE)
    expect(sem.ano_conclusao).toBe('')
    expect(sem.data_conclusao).toBeNull()
    expect(sem.status).toBe('em_andamento')

    const com = prepararDiscenteParaGravar(
      { status: 'em_andamento', ano_conclusao: '2025-03' },
      HOJE,
    )
    expect(com.ano_conclusao).toBe('2025-03')
    expect(com.status).toBe('titulado')
  })

  it('prepararDiscenteParaGravar não perde dado antigo: só ano vira fevereiro; data_conclusao vira o mês', () => {
    const soAno = prepararDiscenteParaGravar(
      { status: 'em_andamento', ano_conclusao: '2024' },
      HOJE,
    )
    expect(soAno.ano_conclusao).toBe('2024-02')
    expect(soAno.status).toBe('titulado')

    const legado = prepararDiscenteParaGravar(
      { status: 'em_andamento', ano_conclusao: '', data_conclusao: '2024-06-15' },
      HOJE,
    )
    expect(legado.ano_conclusao).toBe('2024-06')
    expect(legado.data_conclusao).toBeNull()
  })

  it('desligado segue desligado ao gravar', () => {
    expect(
      prepararDiscenteParaGravar({ status: 'desligado', ano_conclusao: '2020-05' }, HOJE).status,
    ).toBe('desligado')
  })
})

describe('Exibição da conclusão', () => {
  it('mostra MM/AAAA; sem conclusão, vazio (a tela mostra o traço)', () => {
    expect(conclusaoParaExibicao({ ano_conclusao: '2024-06' })).toBe('06/2024')
    expect(conclusaoParaExibicao({ ano_conclusao: '2024' })).toBe('02/2024')
    expect(conclusaoParaExibicao({ data_conclusao: '2025-03-09', ano_conclusao: '' })).toBe(
      '03/2025',
    )
    expect(conclusaoParaExibicao({ data_conclusao: null, ano_conclusao: '' })).toBe('')
  })
})
