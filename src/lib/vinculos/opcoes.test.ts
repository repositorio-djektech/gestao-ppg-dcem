import { describe, it, expect } from 'vitest'
import {
  OPCOES_CLASSIFICACAO_EVENTO,
  OPCOES_MODALIDADE_MOBILIDADE,
  OPCOES_ABRANGENCIA,
  OPCOES_TIPO_PREMIO,
  OPCOES_ITEM_FICHA_IMPACTO,
  OPCOES_TIPO_FATOR_IMPACTO,
  rotuloDaOpcao,
  textoFatorImpacto,
} from './opcoes'

describe('opções dos campos novos (H-31)', () => {
  it('as listas têm exatamente os valores que as CHECKs do banco aceitam', () => {
    expect(OPCOES_CLASSIFICACAO_EVENTO.map((o) => o.value)).toEqual([
      'Nacional',
      'Internacional',
      'Regional',
      'Local',
    ])
    expect(OPCOES_MODALIDADE_MOBILIDADE.map((o) => o.value)).toEqual([
      'nacional',
      'internacional',
      'regional',
    ])
    expect(OPCOES_ABRANGENCIA.map((o) => o.value)).toEqual([
      'internacional',
      'nacional',
      'regional',
      'local',
    ])
    expect(OPCOES_TIPO_PREMIO.map((o) => o.value)).toEqual([
      'recursos_pesquisa',
      'bolsa',
      'mencao_honrosa',
      'outro',
    ])
    expect(OPCOES_ITEM_FICHA_IMPACTO.map((o) => o.value)).toEqual([
      '3.1',
      '3.2_economico',
      '3.2_social',
      '3.2_cultural',
      '3.3.1',
      '3.3.2',
      '3.3.3',
    ])
    expect(OPCOES_TIPO_FATOR_IMPACTO.map((o) => o.value)).toEqual(['JCR', 'FWCI', 'OUTRO'])
  })

  it('rotuloDaOpcao devolve o texto ou vazio', () => {
    expect(rotuloDaOpcao(OPCOES_TIPO_PREMIO, 'bolsa')).toBe('Bolsa')
    expect(rotuloDaOpcao(OPCOES_TIPO_PREMIO, 'xyz')).toBe('')
    expect(rotuloDaOpcao(OPCOES_TIPO_PREMIO, null)).toBe('')
  })

  it('textoFatorImpacto mostra o tipo e o valor; sem valor novo usa o JCR antigo', () => {
    expect(textoFatorImpacto({ fator_impacto_tipo: 'FWCI', fator_impacto_valor: 1.2 })).toBe(
      'FWCI 1,2',
    )
    expect(textoFatorImpacto({ fator_impacto_tipo: 'JCR', fator_impacto_valor: 3.456 })).toBe(
      'JCR 3,456',
    )
    expect(
      textoFatorImpacto({
        fator_impacto_tipo: 'OUTRO',
        fator_impacto_outro: 'CiteScore',
        fator_impacto_valor: 4,
      }),
    ).toBe('Outro (CiteScore) 4')
    expect(textoFatorImpacto({ fator_impacto_jcr: 2.5 })).toBe('JCR 2,5')
    expect(textoFatorImpacto({})).toBe('')
    expect(textoFatorImpacto({ fator_impacto_valor: 'abc' })).toBe('')
  })
})
