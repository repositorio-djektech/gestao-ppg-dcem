import { describe, it, expect } from 'vitest'
import { buscarAutoresScopus } from './services/scopus'

describe('Validação Real Scopus Edge Function', () => {
  it('consulta a função scopus-buscar para Ledjane Barreto', async () => {
    const res = await buscarAutoresScopus('Ledjane Barreto')
    throw new Error(`WINNER_WAS: ${JSON.stringify(res)}`)
  })
})
