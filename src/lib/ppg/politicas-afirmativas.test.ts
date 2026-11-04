import { describe, it, expect } from 'vitest'
import {
  CHAVE_ITEM_1_3,
  LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS,
  validarTextoPoliticasAfirmativas,
} from './politicas-afirmativas'

describe('H-10 — texto do item 1.3 (políticas afirmativas): validação', () => {
  it('usa uma chave estável para o texto', () => {
    expect(CHAVE_ITEM_1_3).toBe('item_1_3_politicas_afirmativas')
  })

  it('aceita texto e remove espaços nas pontas', () => {
    expect(validarTextoPoliticasAfirmativas('  Reserva de vagas e acessibilidade.  \n')).toEqual({
      ok: true,
      texto: 'Reserva de vagas e acessibilidade.',
    })
  })

  it('aceita texto vazio (a coordenação pode limpar o campo)', () => {
    expect(validarTextoPoliticasAfirmativas('   ')).toEqual({ ok: true, texto: '' })
  })

  it('recusa texto acima do limite ("texto curto", D-12) sem truncar', () => {
    const longo = 'a'.repeat(LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS + 1)
    expect(validarTextoPoliticasAfirmativas(longo)).toEqual({ ok: false, motivo: 'muito_longo' })
    const noLimite = 'a'.repeat(LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS)
    expect(validarTextoPoliticasAfirmativas(noLimite).ok).toBe(true)
  })
})
