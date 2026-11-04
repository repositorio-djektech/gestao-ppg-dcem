import { describe, it, expect, vi } from 'vitest'

// Dados fictícios devolvidos pelo "banco". O docente logado é o 1.
const tabelas = vi.hoisted(() => ({
  docentes: [
    { id: 1, nome: 'Ledjane Silva Barreto' },
    { id: 2, nome: 'Mario Ernesto Valerio' },
  ],
  discentes: [
    { id: 10, nome: 'Discente Meu', docente_orientador_id: 1 },
    { id: 12, nome: 'Discente Alheio', docente_orientador_id: 2 },
  ],
  orientacoes: [{ id: 100, docente_id: 1, discente_id: 10 }],
  publicacoes_docentes: [{ publicacao_id: 200, docente_id: 1 }],
  publicacoes: [
    { id: 200, titulo: 'Pub minha' },
    { id: 202, titulo: 'Pub alheia' },
  ],
  projetos_pesquisa: [],
  eventos: [],
  mobilidade_docente: [],
  patentes: [],
  premiacoes: [],
  producao_tecnica: [],
  docentes_linhas: [],
  projetos_participantes: [],
  projetos_discentes: [],
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: (tabela: string) => {
      const rows = (tabelas as Record<string, unknown[]>)[tabela] ?? []
      const resultado = { data: rows, error: null }
      return {
        select: () => ({
          order: () => Promise.resolve(resultado),
          then: (res: (v: typeof resultado) => unknown) => Promise.resolve(resultado).then(res),
        }),
      }
    },
  },
}))

import { obterRelatorioLacunas } from './lacunas'

function totalRegistros(dados: any, tabela: string): number {
  return dados.resumo
    .filter((r: any) => r.tabela === tabela)
    .reduce((m: number, r: any) => Math.max(m, r.total_registros), 0)
}

describe('obterRelatorioLacunas: visão restrita do docente (D-25)', () => {
  it('com restrição, ignora a edge function (que calcula tudo) e consolida só os dados dele', async () => {
    const invokeFn = vi.fn()
    const res = await obterRelatorioLacunas({ invokeFn, restringirAoDocenteId: 1 })

    expect(invokeFn).not.toHaveBeenCalled()
    expect(res.sucesso).toBe(true)
    expect(res.origem).toBe('local_fallback')
    expect(totalRegistros(res.dados, 'docentes')).toBe(1)
    expect(totalRegistros(res.dados, 'discentes')).toBe(1)
    expect(totalRegistros(res.dados, 'publicacoes')).toBe(1)
  })

  it('sem restrição (coordenação), segue usando a edge function e vê tudo', async () => {
    const dados = { gerado_em: 'x', resumo: [], lacunas: [] }
    const invokeFn = vi.fn().mockResolvedValue({ data: dados, error: null })
    const res = await obterRelatorioLacunas({ invokeFn })
    expect(invokeFn).toHaveBeenCalledTimes(1)
    expect(res.origem).toBe('edge_function')
  })

  it('restrição pedida para docente sem cadastro (null) devolve relatório vazio, nunca o completo', async () => {
    const invokeFn = vi.fn()
    const res = await obterRelatorioLacunas({ invokeFn, restringirAoDocenteId: null })
    expect(invokeFn).not.toHaveBeenCalled()
    expect(totalRegistros(res.dados, 'docentes')).toBe(0)
    expect(totalRegistros(res.dados, 'discentes')).toBe(0)
  })
})
