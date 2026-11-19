import { describe, it, expect } from 'vitest'
import { removerCamposDerivados } from '@/services/orientacoes'

describe('orientacoesService — campos derivados', () => {
  it('remove status_efetivo (não é coluna) antes de gravar e preserva o resto', () => {
    const payload = {
      tipo: 'Mestrado',
      inicio: '2025-03-01',
      cancelado: false,
      status_efetivo: 'em_andamento' as const,
    }
    const limpo = removerCamposDerivados(payload)
    expect(limpo).not.toHaveProperty('status_efetivo')
    expect(limpo).toEqual({ tipo: 'Mestrado', inicio: '2025-03-01', cancelado: false })
  })
})
