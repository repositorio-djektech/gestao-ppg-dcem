import { describe, it, expect } from 'vitest'
import { buscarAutoresScopus } from './services/scopus'

describe('Validação Real Scopus Edge Function', () => {
  it('consulta a função scopus-buscar para Ledjane Barreto', async () => {
    const res = await buscarAutoresScopus('Ledjane Barreto')
    // Se a invocação falhou ou não trouxe candidatos, jogamos erro com a mensagem para vermos no log
    if (!res.sucesso || res.candidatos.length === 0) {
      throw new Error(
        `DEBUG_SCOPUS_FAIL: sucesso=${res.sucesso}, erro=${res.mensagemErro}, total=${res.total}, candidatos=${JSON.stringify(res.candidatos)}`,
      )
    }
    // Sucesso!
    expect(res.sucesso).toBe(true)
    expect(res.candidatos.length).toBeGreaterThan(0)
    // Mostra primeiro candidato no erro se quisermos ver os dados exatos:
    const primeiro = res.candidatos[0]
    expect(primeiro.scopus_id).toBe('TEST_FAIL_FOR_OUTPUT')
  })
})
