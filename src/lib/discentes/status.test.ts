import { describe, it, expect } from 'vitest'
import {
  statusEfetivoDiscente,
  rotuloStatusDiscente,
  STATUS_DISCENTE,
  aplicarAnoConclusaoNoForm,
  prepararDiscenteParaGravar,
  conclusaoParaExibicao,
} from './status'

const HOJE = new Date(2026, 10, 19, 15, 30, 0) // 19/11/2026

describe('Status do discente a partir do ano de conclusão (D-28)', () => {
  it('só existem três status: Em andamento, Titulado e Desligado', () => {
    expect(STATUS_DISCENTE).toEqual(['em_andamento', 'titulado', 'desligado'])
    expect(rotuloStatusDiscente('em_andamento')).toBe('Em andamento')
    expect(rotuloStatusDiscente('titulado')).toBe('Titulado')
    expect(rotuloStatusDiscente('desligado')).toBe('Desligado')
  })

  it('sem ano de conclusão: em andamento', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: null }, HOJE)).toBe(
      'em_andamento',
    )
    expect(statusEfetivoDiscente({ status: 'ativo' }, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '' }, HOJE)).toBe(
      'em_andamento',
    )
    // status gravado como titulado, mas sem ano: não vale
    expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('ano futuro: em andamento (mesmo que o status gravado seja titulado)', () => {
    expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '2027' }, HOJE)).toBe(
      'em_andamento',
    )
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2030' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('ano atual: ainda em andamento, o ano só passa em 31/12 (P-27)', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2026' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('ano passado: titulado', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: '2025' }, HOJE)).toBe(
      'titulado',
    )
    expect(statusEfetivoDiscente({ status: 'concluido', ano_conclusao: '2024' }, HOJE)).toBe(
      'titulado',
    )
  })

  it('o status acompanha o passar do tempo (ano que era futuro vira passado)', () => {
    const d = { status: 'em_andamento', ano_conclusao: '2026' }
    expect(statusEfetivoDiscente(d, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente(d, new Date(2026, 11, 31))).toBe('em_andamento')
    expect(statusEfetivoDiscente(d, new Date(2027, 0, 1))).toBe('titulado')
  })

  it('desligado é manual e prevalece sobre o ano', () => {
    expect(statusEfetivoDiscente({ status: 'desligado', ano_conclusao: '2020' }, HOJE)).toBe(
      'desligado',
    )
    expect(statusEfetivoDiscente({ status: 'desligado' }, HOJE)).toBe('desligado')
  })

  it('ano inválido é tratado como sem ano', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', ano_conclusao: 'abc' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('registro antigo só com data_conclusao vale pelo ano dela; o ano_conclusao vale mais', () => {
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2025-03-10' }, HOJE),
    ).toBe('titulado')
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2027-01-01' }, HOJE),
    ).toBe('em_andamento')
    expect(
      statusEfetivoDiscente(
        { status: 'titulado', ano_conclusao: '2027', data_conclusao: '2020-01-01' },
        HOJE,
      ),
    ).toBe('em_andamento')
  })
})

describe('Formulário de discente: ano de conclusão e status', () => {
  it('ao informar um ano passado o status do formulário vira titulado; futuro, em andamento', () => {
    const base = { nome: 'Discente Ficticio', status: 'em_andamento', ano_conclusao: '' }
    expect(aplicarAnoConclusaoNoForm(base, '2025', HOJE).status).toBe('titulado')
    expect(aplicarAnoConclusaoNoForm(base, '2027', HOJE).status).toBe('em_andamento')
    expect(aplicarAnoConclusaoNoForm(base, '2025', HOJE).ano_conclusao).toBe('2025')
  })

  it('ao limpar o ano volta para em andamento', () => {
    const base = { status: 'titulado', ano_conclusao: '2025' }
    expect(aplicarAnoConclusaoNoForm(base, '', HOJE).status).toBe('em_andamento')
  })

  it('desligado não é alterado pelo ano', () => {
    const base = { status: 'desligado', ano_conclusao: '' }
    expect(aplicarAnoConclusaoNoForm(base, '2025', HOJE).status).toBe('desligado')
  })

  it('a data antiga é descartada quando o ano muda', () => {
    const base = { status: 'em_andamento', ano_conclusao: '2025', data_conclusao: '2025-03-10' }
    expect(aplicarAnoConclusaoNoForm(base, '2027', HOJE).data_conclusao).toBe('')
  })

  it('prepararDiscenteParaGravar: o ano é a fonte, a data antiga vira null e o status é o efetivo', () => {
    const sem = prepararDiscenteParaGravar({ status: 'titulado', ano_conclusao: '' }, HOJE)
    expect(sem.ano_conclusao).toBe('')
    expect(sem.data_conclusao).toBeNull()
    expect(sem.status).toBe('em_andamento')

    const com = prepararDiscenteParaGravar({ status: 'em_andamento', ano_conclusao: '2025' }, HOJE)
    expect(com.ano_conclusao).toBe('2025')
    expect(com.status).toBe('titulado')
  })

  it('prepararDiscenteParaGravar não perde dado antigo: data_conclusao vira o ano', () => {
    const legado = prepararDiscenteParaGravar(
      { status: 'em_andamento', ano_conclusao: '', data_conclusao: '2024-06-15' },
      HOJE,
    )
    expect(legado.ano_conclusao).toBe('2024')
    expect(legado.data_conclusao).toBeNull()
    expect(legado.status).toBe('titulado')
  })

  it('desligado segue desligado ao gravar', () => {
    expect(
      prepararDiscenteParaGravar({ status: 'desligado', ano_conclusao: '2020' }, HOJE).status,
    ).toBe('desligado')
  })
})

describe('Exibição da conclusão', () => {
  it('mostra só o ano; sem ano, vazio (a tela mostra o traço)', () => {
    expect(conclusaoParaExibicao({ ano_conclusao: '2024' })).toBe('2024')
    expect(conclusaoParaExibicao({ data_conclusao: '2025-03-09', ano_conclusao: '' })).toBe('2025')
    expect(conclusaoParaExibicao({ data_conclusao: null, ano_conclusao: '' })).toBe('')
  })
})
