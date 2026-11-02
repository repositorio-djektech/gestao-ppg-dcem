/**
 * Testes de VERIFICAÇÃO dos serviços que alimentam os cálculos (S2/S4).
 * Capturam as colunas selecionadas de cada tabela, sem acessar o banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { chamadas } = vi.hoisted(() => ({ chamadas: [] as Array<[string, string]> }))

vi.mock('@/lib/supabase/client', () => {
  const from = (tabela: string) => ({
    select: (colunas: string) => {
      chamadas.push([tabela, colunas])
      const res: any = Promise.resolve({ data: [], error: null })
      res.order = () => res
      return res
    },
  })
  return {
    supabase: { from, functions: { invoke: vi.fn() } },
  }
})

import { obterIndicadoresCapes } from './indicadores-capes'
import { obterAvaliacaoReconducao } from './reconducao'

const colunas = (tabela: string) =>
  chamadas
    .filter(([t]) => t === tabela)
    .map(([, c]) => c)
    .join(',')

beforeEach(() => {
  chamadas.length = 0
})

describe('S2 — colunas que os serviços precisam buscar', () => {
  it('indicadores: orientacoes inclui "cancelado" (status efetivo depende dele)', async () => {
    await obterIndicadoresCapes()
    expect(colunas('orientacoes')).toContain('cancelado')
  })

  it('recondução (local): orientacoes inclui "cancelado"', async () => {
    await obterAvaliacaoReconducao({ executarLocal: true })
    expect(colunas('orientacoes')).toContain('cancelado')
  })

  it('recondução (local): docentes inclui "status" (inativos precisam ser identificáveis)', async () => {
    await obterAvaliacaoReconducao({ executarLocal: true })
    expect(colunas('docentes')).toContain('status')
  })
})

describe('S4 — disciplinas N:N', () => {
  it('indicadores leem disciplinas_docentes', async () => {
    await obterIndicadoresCapes()
    expect(chamadas.map(([t]) => t)).toContain('disciplinas_docentes')
  })

  it('recondução (local) lê disciplinas_docentes', async () => {
    await obterAvaliacaoReconducao({ executarLocal: true })
    expect(chamadas.map(([t]) => t)).toContain('disciplinas_docentes')
  })
})
