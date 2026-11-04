import { describe, it, expect } from 'vitest'
import { ehCoorientacao, filtrarOrientacoesPrincipais } from './principal'

// Dados fictícios.
const discentes = [
  { id: 1, docente_orientador_id: 10 },
  { id: 2, docente_orientador_id: null },
]

describe('P-12 — o que é coorientação para fins de cálculo', () => {
  it('é coorientação: vínculo não principal de um docente que NÃO é o orientador do discente', () => {
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: 1, flag_orientador_principal: false },
        discentes,
      ),
    ).toBe(true)
  })

  it('não é: flag principal verdadeira', () => {
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: 1, flag_orientador_principal: true },
        discentes,
      ),
    ).toBe(false)
  })

  it('não é: o docente é o orientador principal do discente (orientação manual tem flag false por padrão)', () => {
    expect(
      ehCoorientacao(
        { docente_id: 10, discente_id: 1, flag_orientador_principal: false },
        discentes,
      ),
    ).toBe(false)
  })

  it('não é (conservador): flag ausente, discente sem orientador, discente desconhecido ou sem lista de discentes', () => {
    expect(ehCoorientacao({ docente_id: 20, discente_id: 1 }, discentes)).toBe(false)
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: 2, flag_orientador_principal: false },
        discentes,
      ),
    ).toBe(false)
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: 99, flag_orientador_principal: false },
        discentes,
      ),
    ).toBe(false)
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: 1, flag_orientador_principal: false },
        undefined,
      ),
    ).toBe(false)
    expect(
      ehCoorientacao(
        { docente_id: 20, discente_id: null, flag_orientador_principal: false },
        discentes,
      ),
    ).toBe(false)
  })

  it('filtrarOrientacoesPrincipais remove só as coorientações', () => {
    const lista = [
      { id: 1, docente_id: 10, discente_id: 1, flag_orientador_principal: true },
      { id: 2, docente_id: 20, discente_id: 1, flag_orientador_principal: false },
      { id: 3, docente_id: 20, discente_id: 2, flag_orientador_principal: false },
    ]
    expect(filtrarOrientacoesPrincipais(lista, discentes).map((o) => o.id)).toEqual([1, 3])
  })
})
