import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Publicacoes from './Publicacoes'

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

describe('Ajustes de UI - /publicacoes Header e Tabela', () => {
  it('renderiza botões "Sugerir Qualis" (sem OpenAlex/Scopus) e "Vincular Docentes" e coluna "Títulos"', () => {
    const html = renderToString(<Publicacoes />)

    // Botões renomeados
    expect(html).toContain('Sugerir Qualis')
    expect(html).not.toContain('Sugerir Qualis (OpenAlex/Scopus)')
    expect(html).toContain('Vincular Docentes')
    expect(html).not.toContain('Vincular autores a docentes')

    // Botão Nova Publicação presente
    expect(html).toContain('Nova Publicação')

    // Botão Imprimir presente
    expect(html).toContain('Imprimir')

    // Coluna renomeada para "Títulos" (em vez de "Título & Autores")
    expect(html).toContain('Títulos')
    expect(html).not.toContain('Título &amp; Autores')
    expect(html).not.toContain('Título & Autores')

    // Coluna Títulos tem largura dobrada: w-[52%] min-w-[420px]
    expect(html).toContain('w-[52%]')
  })
})
