import { describe, it, expect } from 'vitest'
import {
  statusEfetivoDiscente,
  rotuloStatusDiscente,
  STATUS_DISCENTE,
  aplicarDataConclusaoNoForm,
  prepararDiscenteParaGravar,
  conclusaoParaExibicao,
} from './status'

const HOJE = new Date(2026, 10, 4, 15, 30, 0) // 04/11/2026

describe('Status do discente a partir da data de conclusão', () => {
  it('só existem três status: Em andamento, Titulado e Desligado', () => {
    expect(STATUS_DISCENTE).toEqual(['em_andamento', 'titulado', 'desligado'])
    expect(rotuloStatusDiscente('em_andamento')).toBe('Em andamento')
    expect(rotuloStatusDiscente('titulado')).toBe('Titulado')
    expect(rotuloStatusDiscente('desligado')).toBe('Desligado')
  })

  it('sem data de conclusão: em andamento', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: null }, HOJE)).toBe(
      'em_andamento',
    )
    expect(statusEfetivoDiscente({ status: 'ativo' }, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '' }, HOJE)).toBe(
      'em_andamento',
    )
  })

  it('data futura: em andamento (mesmo que o status gravado seja titulado)', () => {
    expect(statusEfetivoDiscente({ status: 'titulado', data_conclusao: '2026-11-05' }, HOJE)).toBe(
      'em_andamento',
    )
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2027-06-30' }, HOJE),
    ).toBe('em_andamento')
  })

  it('data de hoje ou passada: titulado', () => {
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2026-11-04' }, HOJE),
    ).toBe('titulado')
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2025-03-10' }, HOJE),
    ).toBe('titulado')
  })

  it('o status acompanha o passar do tempo (data que era futura vira passada)', () => {
    const d = { status: 'em_andamento', data_conclusao: '2026-12-01' }
    expect(statusEfetivoDiscente(d, HOJE)).toBe('em_andamento')
    expect(statusEfetivoDiscente(d, new Date(2026, 11, 2))).toBe('titulado')
  })

  it('desligado é manual e prevalece sobre a data', () => {
    expect(statusEfetivoDiscente({ status: 'desligado', data_conclusao: '2025-03-10' }, HOJE)).toBe(
      'desligado',
    )
    expect(statusEfetivoDiscente({ status: 'desligado' }, HOJE)).toBe('desligado')
  })

  it('data inválida é tratada como sem data', () => {
    expect(statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: 'abc' }, HOJE)).toBe(
      'em_andamento',
    )
    expect(
      statusEfetivoDiscente({ status: 'em_andamento', data_conclusao: '2026-13-45' }, HOJE),
    ).toBe('em_andamento')
  })

  describe('dados antigos (sem data de conclusão, só o ano)', () => {
    it('status gravado concluído/titulado com ano de conclusão já ocorrido continua titulado', () => {
      expect(statusEfetivoDiscente({ status: 'concluido', ano_conclusao: '2024' }, HOJE)).toBe(
        'titulado',
      )
      expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '2026' }, HOJE)).toBe(
        'titulado',
      )
    })

    it('ano de conclusão futuro, ou ausente, ou status ativo: em andamento', () => {
      expect(statusEfetivoDiscente({ status: 'titulado', ano_conclusao: '2099' }, HOJE)).toBe(
        'em_andamento',
      )
      expect(statusEfetivoDiscente({ status: 'concluido' }, HOJE)).toBe('em_andamento')
      expect(statusEfetivoDiscente({ status: 'ativo', ano_conclusao: '2020' }, HOJE)).toBe(
        'em_andamento',
      )
    })

    it('a data de conclusão, quando existe, vale mais que o ano antigo', () => {
      expect(
        statusEfetivoDiscente(
          { status: 'titulado', ano_conclusao: '2020', data_conclusao: '2027-01-01' },
          HOJE,
        ),
      ).toBe('em_andamento')
    })
  })
})

describe('Formulário de discente: data de conclusão e status', () => {
  it('ao informar uma data passada o status do formulário vira titulado; futura, em andamento', () => {
    const base = { nome: 'Discente Ficticio', status: 'em_andamento', data_conclusao: '' }
    expect(aplicarDataConclusaoNoForm(base, '2025-03-10', HOJE).status).toBe('titulado')
    expect(aplicarDataConclusaoNoForm(base, '2027-03-10', HOJE).status).toBe('em_andamento')
    expect(aplicarDataConclusaoNoForm(base, '2025-03-10', HOJE).data_conclusao).toBe('2025-03-10')
  })

  it('ao limpar a data volta para em andamento', () => {
    const base = { status: 'titulado', data_conclusao: '2025-03-10' }
    expect(aplicarDataConclusaoNoForm(base, '', HOJE).status).toBe('em_andamento')
  })

  it('desligado não é alterado pela data', () => {
    const base = { status: 'desligado', data_conclusao: '' }
    expect(aplicarDataConclusaoNoForm(base, '2025-03-10', HOJE).status).toBe('desligado')
  })

  it('prepararDiscenteParaGravar: data vazia vira null, status é o efetivo e o ano acompanha a data', () => {
    const sem = prepararDiscenteParaGravar({ status: 'titulado', data_conclusao: '' }, HOJE)
    expect(sem.data_conclusao).toBeNull()
    expect(sem.status).toBe('em_andamento')

    const com = prepararDiscenteParaGravar(
      { status: 'em_andamento', data_conclusao: '2025-03-10', ano_conclusao: '' },
      HOJE,
    )
    expect(com.data_conclusao).toBe('2025-03-10')
    expect(com.status).toBe('titulado')
    expect(com.ano_conclusao).toBe('2025')
  })

  it('prepararDiscenteParaGravar não perde dado antigo: sem data mantém o ano e o status titulado legado', () => {
    const legado = prepararDiscenteParaGravar(
      { status: 'concluido', data_conclusao: '', ano_conclusao: '2024' },
      HOJE,
    )
    expect(legado.status).toBe('titulado')
    expect(legado.ano_conclusao).toBe('2024')
  })
})

describe('Exibição da conclusão', () => {
  it('mostra a data em dd/mm/aaaa; sem data, o ano antigo; sem nada, vazio', () => {
    expect(conclusaoParaExibicao({ data_conclusao: '2025-03-09', ano_conclusao: '2020' })).toBe(
      '09/03/2025',
    )
    expect(conclusaoParaExibicao({ data_conclusao: null, ano_conclusao: '2024' })).toBe('2024')
    expect(conclusaoParaExibicao({ data_conclusao: null, ano_conclusao: '' })).toBe('')
  })
})
