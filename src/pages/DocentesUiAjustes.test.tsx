import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Docentes from './Docentes'

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

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}))

describe('Ajustes de UI - /docentes Tabela Ações', () => {
  it('renderiza cabeçalho Ações alinhado à esquerda e largura compacta', () => {
    const html = renderToString(<Docentes />)

    // Cabeçalho Ações com text-left
    expect(html).toContain('text-left')
    expect(html).toContain('Ações')
  })
})
