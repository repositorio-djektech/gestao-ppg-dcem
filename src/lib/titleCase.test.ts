import { describe, it, expect } from 'vitest'
import { toTitleCase } from './titleCase'

describe('toTitleCase', () => {
  it('retorna string vazia para valores nulos, indefinidos ou vazios', () => {
    expect(toTitleCase(null)).toBe('')
    expect(toTitleCase(undefined)).toBe('')
    expect(toTitleCase('')).toBe('')
    expect(toTitleCase('   ')).toBe('')
  })

  it('mantém preposições e conectivos em minúsculas (de, da, do, e, em, com...)', () => {
    expect(toTitleCase('maria da silva e souza')).toBe('Maria da Silva e Souza')
    expect(toTitleCase('ESTUDO DO IMPACTO EM MATERIAIS')).toBe('Estudo do Impacto em Materiais')
    expect(toTitleCase('PESQUISA COM NANOTUBOS DE CARBONO')).toBe(
      'Pesquisa com Nanotubos de Carbono',
    )
  })

  it('capitaliza preposições se forem a primeira palavra do texto', () => {
    expect(toTitleCase('da síntese à caracterização')).toBe('Da Síntese à Caracterização')
    expect(toTitleCase('DE ACORDO COM A CAPES')).toBe('De Acordo com a CAPES')
  })

  it('preserva siglas e acrônimos consagrados em maiúsculas', () => {
    expect(toTitleCase('PROGRAMA DE PÓS-GRADUAÇÃO DA UFS E CAPES')).toBe(
      'Programa de Pós-Graduação da UFS e CAPES',
    )
    expect(toTitleCase('CONGRESSO DA ABCM E AGITTE')).toBe('Congresso da ABCM e AGITTE')
    expect(toTitleCase('BOLSA DO CNPq E DA FAPITEC')).toBe('Bolsa do CNPq e da FAPITEC')
    expect(toTitleCase('AVALIAÇÃO DO JDP E PDQ')).toBe('Avaliação do JDP e PDQ')
    expect(toTitleCase('ANÁLISE POR FTIR E DRX')).toBe('Análise por FTIR e DRX')
  })

  it('normaliza nomes e títulos escritos em ALL CAPS mantendo siglas', () => {
    expect(toTitleCase('SILVA, J. A.')).toBe('Silva, J. A.')
    expect(toTitleCase('JOURNAL OF MATERIALS RESEARCH AND TECHNOLOGY')).toBe(
      'Journal of Materials Research and Technology',
    )
  })

  it('preserva fórmulas químicas e símbolos com dígitos', () => {
    expect(toTitleCase('SÍNTESE DE TiO2 E nano-CaCO3')).toBe('Síntese de TiO2 e Nano-CaCO3')
    expect(toTitleCase('PRODUÇÃO DO PROGRAMA P²CEM')).toBe('Produção do Programa P²CEM')
  })

  it('preserva acentuação em português', () => {
    expect(toTitleCase('ciência dos materiais e engenharia')).toBe(
      'Ciência dos Materiais e Engenharia',
    )
    expect(toTitleCase('AÇÃO SOCIAL NA COMUNIDADE DE SÃO CRISTÓVÃO')).toBe(
      'Ação Social na Comunidade de São Cristóvão',
    )
  })

  it('preserva numerais romanos', () => {
    expect(toTitleCase('ENCONTRO NACIONAL DE MATERIAIS II')).toBe(
      'Encontro Nacional de Materiais II',
    )
    expect(toTitleCase('SIMPÓSIO XIV')).toBe('Simpósio XIV')
  })

  it('preserva e-mails e DOIs sem distorcer', () => {
    expect(toTitleCase('contato@ufs.br')).toBe('contato@ufs.br')
    expect(toTitleCase('10.1016/j.jmrt.2023.01.002')).toBe('10.1016/j.jmrt.2023.01.002')
    expect(toTitleCase('https://doi.org/10.1016/j.jmrt.2023.01.002')).toBe(
      'https://doi.org/10.1016/j.jmrt.2023.01.002',
    )
  })

  it('capitaliza adequadamente após hífens', () => {
    expect(toTitleCase('sudeste-brasileiro')).toBe('Sudeste-Brasileiro')
    expect(toTitleCase('físico-química')).toBe('Físico-Química')
  })
})
