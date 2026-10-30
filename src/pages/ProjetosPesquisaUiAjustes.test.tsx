import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import ProjetosPesquisa from './ProjetosPesquisa'

// Mocks de autenticação, router e supabase
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', role: 'coordenador', email: 'coord@ufs.br' },
    role: 'coordenador',
    docenteIdLogado: null,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}))

vi.mock('@/hooks/use-crud-data', () => ({
  useCrudData: () => ({
    data: [
      {
        id: 1,
        titulo:
          'Desenvolvimento e caracterização de novos biomateriais nanocompósitos funcionalizados para aplicações biomédicas avançadas e regeneração tecidual guiada em ensaios pré-clínicos',
        coordenador_id: 10,
        financiamento: true,
        financiador_nome: 'FAPITEC / CNPq',
        valor_financiamento: 150000,
        classificacao: 'institucional',
        inicio: '2024-01-01',
        fim: '2026-12-31',
      },
    ],
    loading: false,
    error: null,
    fetchData: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      delete: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}))

describe('Ajustes de UI - /projetos-pesquisa Larguras de Colunas', () => {
  it('renderiza coluna Título reduzida em ~30% (w-[35%] min-w-[336px]) com line-clamp-3 e title preservado', () => {
    const html = renderToString(<ProjetosPesquisa />)

    // Coluna Título reduzida em ~30% (de ~50% / min-w-[480px] para ~35% / min-w-[336px])
    expect(html).toContain('w-[35%]')
    expect(html).toContain('min-w-[336px]')
    expect(html).not.toContain('w-[50%]')
    expect(html).not.toContain('min-w-[480px]')

    // Texto com line-clamp-3 e title acessível
    expect(html).toContain('line-clamp-3')
    expect(html).toContain(
      'title="Desenvolvimento e caracterização de novos biomateriais nanocompósitos funcionalizados para aplicações biomédicas avançadas e regeneração tecidual guiada em ensaios pré-clínicos"',
    )
  })

  it('renderiza colunas Coordenador e Financiamento com largura aumentada em ~60% (w-[18%] min-w-[240px])', () => {
    const html = renderToString(<ProjetosPesquisa />)

    // Coordenador e Financiamento com min-w-[240px] w-[18%]
    expect(html).toContain('min-w-[240px]')
    expect(html).toContain('w-[18%]')
  })

  it('renderiza texto do Financiamento com quebra em até 3 linhas (line-clamp-3 break-words whitespace-normal) e title preservado', () => {
    const html = renderToString(<ProjetosPesquisa />)

    // Verifica que o financiador possui quebra em até 3 linhas e não line-clamp-1
    expect(html).toContain('title="FAPITEC / CNPq"')
    expect(html).toContain('FAPITEC / CNPq')
    expect(html).toContain('line-clamp-3 break-words whitespace-normal')
    expect(html).not.toContain('line-clamp-1')
  })
})
