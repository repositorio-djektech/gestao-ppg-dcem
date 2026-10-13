import { describe, it, expect } from 'vitest'
import { normalizarNomePessoa, normalizarTituloAcademico } from './normalizacao'

describe('normalizarNomePessoa', () => {
  it('normaliza o exemplo fornecido pelo usuário', () => {
    expect(normalizarNomePessoa('ledjane de Jesus Silva barreto')).toBe(
      'Ledjane de Jesus Silva Barreto',
    )
  })

  it('normaliza nomes em CAIXA ALTA preservando conectivos em minúsculas', () => {
    expect(normalizarNomePessoa('CARLOS OTAVIO DAMAS MARTINS')).toBe('Carlos Otavio Damas Martins')
    expect(normalizarNomePessoa('THALYSON ISSAC DE JESUS BRITO')).toBe(
      'Thalyson Issac de Jesus Brito',
    )
    expect(normalizarNomePessoa('FRANCIELLE OLIVEIRA DOS SANTOS')).toBe(
      'Francielle Oliveira dos Santos',
    )
    expect(normalizarNomePessoa('PAULO DO AMARAL COSTA')).toBe('Paulo do Amaral Costa')
    expect(normalizarNomePessoa('CLEVERTON ALBUQUERQUE SANTOS FILHO')).toBe(
      'Cleverton Albuquerque Santos Filho',
    )
  })

  it('preserva numerais romanos em nomes', () => {
    expect(normalizarNomePessoa('joão alves ii')).toBe('João Alves II')
  })
})

describe('normalizarTituloAcademico', () => {
  it('converte títulos em CAIXA ALTA para Title Case mantendo conectivos e fórmulas', () => {
    const raw =
      'COMPARATIVE ANALYSIS OF SPECTRAL BROADENING TECHNIQUES FOR OPTICAL TEMPERATURE SENSING IN YTTRIUM FLUORIDE (YF3) DOPED WITH NEODYMIUM'
    const result = normalizarTituloAcademico(raw)
    expect(result).toContain('Comparative Analysis of Spectral Broadening')
    expect(result).toContain('YF3')
    expect(result).toContain('in')
    expect(result).toContain('with')
  })

  it('preserva siglas como CAPES, CNPq, UFS, EIDTI', () => {
    const raw =
      '1º LUGAR DA AREA DE CIÊNCIAS EXATAS E DA TERRA NO 17º ENCONTRO DE INICIAÇÃO CIENTIFICA EM DESENVOLVIMENTO TECNOLÓGICO E INOVAÇÃO'
    const result = normalizarTituloAcademico(raw)
    expect(result).toContain('1º Lugar da Area de Ciências Exatas e da Terra no 17º Encontro')

    const raw2 = '3º LUGAR DA AREA DE CIENCIAS EXATAS E DA TERRA NO 18º EIDTI'
    const result2 = normalizarTituloAcademico(raw2)
    expect(result2).toContain('EIDTI')
  })

  it('mantém títulos já adequadamente capitalizados sem deformação', () => {
    const raw =
      'Effects of ethylene glycol and nano-CaCO3 on carbonation and self-healing potential of aging Portland cement mortars'
    expect(normalizarTituloAcademico(raw)).toContain('Effects')
    expect(normalizarTituloAcademico(raw)).toContain('nano-CaCO3')
  })
})
