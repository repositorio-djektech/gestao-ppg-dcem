import { describe, it, expect } from 'vitest'
import {
  TIPOS_INICIACAO_ORIENTACAO,
  codigoDeTipoOrientacao,
  tipoOrientacaoDeCodigo,
  ehTipoIniciacao,
  OPCOES_TIPO_ORIENTACAO,
} from './tipos'

describe('Tipos de iniciação (D-30)', () => {
  it('são três: científica, tecnológica e em extensão', () => {
    expect(TIPOS_INICIACAO_ORIENTACAO).toEqual([
      'Iniciação Científica',
      'Iniciação Tecnológica',
      'Iniciação em Extensão',
    ])
  })

  it('converte o tipo de Orientações para o código de Iniciações (sem depender de acento ou caixa)', () => {
    expect(codigoDeTipoOrientacao('Iniciação Científica')).toBe('iniciacao_cientifica')
    expect(codigoDeTipoOrientacao('Iniciação Tecnológica')).toBe('iniciacao_tecnologica')
    expect(codigoDeTipoOrientacao('Iniciação em Extensão')).toBe('iniciacao_extensao')
    expect(codigoDeTipoOrientacao('INICIACAO CIENTIFICA')).toBe('iniciacao_cientifica')
    expect(codigoDeTipoOrientacao('  iniciação em extensão ')).toBe('iniciacao_extensao')
  })

  it('outros tipos não são iniciação', () => {
    for (const t of [
      'Mestrado',
      'Doutorado',
      'Pós-Doutorado',
      'TCC / Graduação',
      'OUTRA',
      '',
      null,
    ]) {
      expect(codigoDeTipoOrientacao(t)).toBeNull()
      expect(ehTipoIniciacao(t)).toBe(false)
    }
  })

  it('ida e volta: código -> tipo -> código', () => {
    for (const cod of ['iniciacao_cientifica', 'iniciacao_tecnologica', 'iniciacao_extensao']) {
      const tipo = tipoOrientacaoDeCodigo(cod)
      expect(tipo).not.toBeNull()
      expect(codigoDeTipoOrientacao(tipo)).toBe(cod)
    }
    expect(tipoOrientacaoDeCodigo('outro')).toBeNull()
  })

  it('o campo de tipo em Orientações oferece os três tipos de iniciação', () => {
    const valores = OPCOES_TIPO_ORIENTACAO.map((o) => o.value)
    expect(valores).toEqual(
      expect.arrayContaining([
        'Iniciação Científica',
        'Iniciação Tecnológica',
        'Iniciação em Extensão',
      ]),
    )
    expect(valores).toEqual(
      expect.arrayContaining(['Mestrado', 'Doutorado', 'Pós-Doutorado', 'TCC / Graduação']),
    )
    expect(new Set(valores).size).toBe(valores.length)
  })
})
