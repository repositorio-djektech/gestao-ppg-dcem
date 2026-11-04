import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState = vi.hoisted(() => ({
  role: 'coordenador' as string | null,
  docenteId: null as number | null,
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    role: authState.role,
    loading: false,
    profile: { id: 'u1', role: authState.role, docente_id: authState.docenteId },
  }),
}))

// Dados fictícios: o docente 10 está vinculado às publicações 1 e 2; o docente 20 à 2 e 3.
vi.mock('@/services/publicacoes', () => ({
  publicacoesService: {
    list: () =>
      Promise.resolve([
        { id: 1, titulo: 'Artigo Meu', autores: 'A', periodico: 'P', ano: 2025, doi: '' },
        {
          id: 2,
          titulo: 'Artigo Compartilhado',
          autores: 'A; B',
          periodico: 'P',
          ano: 2025,
          doi: '',
        },
        { id: 3, titulo: 'Artigo Alheio', autores: 'B', periodico: 'P', ano: 2025, doi: '' },
        { id: 4, titulo: 'Artigo Orfao', autores: 'C', periodico: 'P', ano: 2025, doi: '' },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/publicacoes-docentes', () => ({
  publicacoesDocentesService: {
    listarTodos: () =>
      Promise.resolve([
        { id: 1, publicacao_id: 1, docente_id: 10 },
        { id: 2, publicacao_id: 2, docente_id: 10 },
        { id: 3, publicacao_id: 2, docente_id: 20 },
        { id: 4, publicacao_id: 3, docente_id: 20 },
      ]),
    sincronizarDocentes: vi.fn(),
  },
}))
vi.mock('@/services/discentes', () => ({ discentesService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/egressos', () => ({ egressosService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/docentes', () => ({ docentesService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/coautores-programa', () => ({
  coautoresProgramaService: { listarTodos: () => Promise.resolve([]) },
}))
vi.mock('@/services/qualis', () => ({ qualisService: { list: () => Promise.resolve([]) } }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: () => ({}), auth: {} } }))

import Publicacoes from './Publicacoes'

afterEach(() => {
  cleanup()
  authState.role = 'coordenador'
  authState.docenteId = null
})

async function montar(esperar: string): Promise<HTMLElement> {
  const { container } = render(
    <MemoryRouter>
      <Publicacoes />
    </MemoryRouter>,
  )
  await waitFor(() => expect(container.textContent, container.textContent ?? '').toContain(esperar))
  return container
}

describe('Publicações: visão restrita do docente (D-27)', () => {
  it('docente vê só as publicações vinculadas a ele (próprias e compartilhadas)', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar('Artigo Meu')
    expect(c.textContent).toContain('Artigo Compartilhado')
    expect(c.textContent).not.toContain('Artigo Alheio')
    expect(c.textContent).not.toContain('Artigo Orfao')
  })

  it('docente tem o botão Nova Publicação (CRUD nas próprias)', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar('Artigo Meu')
    expect(c.textContent).toContain('Nova Publicação')
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s vê todas as publicações', async (papel) => {
    authState.role = papel
    const c = await montar('Artigo Meu')
    for (const t of ['Artigo Alheio', 'Artigo Orfao']) expect(c.textContent).toContain(t)
  })
})
