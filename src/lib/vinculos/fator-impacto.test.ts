import { describe, it, expect } from 'vitest'
import { atualizarFatorImpacto, fatorImpactoParaFormulario } from './fator-impacto'

describe('fator de impacto com tipo (H-31)', () => {
  it('publicação antiga com só JCR abre como tipo JCR com o mesmo valor', () => {
    expect(fatorImpactoParaFormulario({ fator_impacto_jcr: 3.4 })).toMatchObject({
      fator_impacto_tipo: 'JCR',
      fator_impacto_valor: 3.4,
    })
    expect(fatorImpactoParaFormulario({ fator_impacto_jcr: null })).toEqual({
      fator_impacto_jcr: null,
    })
    const ja = { fator_impacto_tipo: 'FWCI' as const, fator_impacto_valor: 1.1 }
    expect(fatorImpactoParaFormulario(ja)).toBe(ja)
  })

  it('JCR mantém o campo antigo igual ao valor', () => {
    const f = atualizarFatorImpacto({}, { tipo: 'JCR', valor: 2.5 })
    expect(f).toMatchObject({
      fator_impacto_tipo: 'JCR',
      fator_impacto_valor: 2.5,
      fator_impacto_jcr: 2.5,
    })
  })

  it('FWCI e outro não deixam valor no campo JCR', () => {
    const f = atualizarFatorImpacto({ fator_impacto_jcr: 3 }, { tipo: 'FWCI', valor: 1.4 })
    expect(f.fator_impacto_jcr).toBeNull()
    expect(f.fator_impacto_valor).toBe(1.4)
    const o = atualizarFatorImpacto({}, { tipo: 'OUTRO', valor: 5, outro: 'CiteScore' })
    expect(o).toMatchObject({ fator_impacto_outro: 'CiteScore', fator_impacto_jcr: null })
  })

  it('mudar só o valor ou só o nome preserva o tipo escolhido', () => {
    const base = atualizarFatorImpacto({}, { tipo: 'OUTRO', valor: 1, outro: 'SJR' })
    expect(atualizarFatorImpacto(base, { valor: 2 })).toMatchObject({
      fator_impacto_tipo: 'OUTRO',
      fator_impacto_valor: 2,
      fator_impacto_outro: 'SJR',
    })
    expect(atualizarFatorImpacto(base, { outro: 'CiteScore' }).fator_impacto_outro).toBe(
      'CiteScore',
    )
  })

  it('sem tipo, o valor e o nome somem (publicação sem fator de impacto)', () => {
    const f = atualizarFatorImpacto(
      { fator_impacto_tipo: 'JCR' as const, fator_impacto_valor: 3, fator_impacto_jcr: 3 },
      { tipo: null },
    )
    expect(f).toMatchObject({
      fator_impacto_tipo: null,
      fator_impacto_valor: null,
      fator_impacto_outro: '',
      fator_impacto_jcr: null,
    })
  })

  it('valor vazio ou inválido vira null, nunca zero', () => {
    expect(atualizarFatorImpacto({}, { tipo: 'JCR', valor: null }).fator_impacto_valor).toBeNull()
    expect(atualizarFatorImpacto({}, { tipo: 'JCR', valor: NaN }).fator_impacto_valor).toBeNull()
  })
})
