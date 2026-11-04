import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Usuário logado (padrão: coordenação). Os testes trocam para docente.
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

// Dados fictícios devolvidos pelas telas
vi.mock('@/services/linhas-pesquisa', () => ({
  linhasPesquisaService: {
    list: () =>
      Promise.resolve([{ id: 1, nome: 'Linha Ficticia Um', descricao: 'Descricao', area: 'Area' }]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/impacto-social', () => ({
  impactoSocialService: {
    list: () =>
      Promise.resolve([
        {
          id: 5,
          titulo: 'Impacto Ficticio Cinco',
          descricao: 'Descricao do impacto',
          ano: 2025,
          tipo: 'social',
        },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/impactos-vinculos', () => ({
  impactosVinculosService: {
    listarTodos: () => Promise.resolve([]),
    listarPorEntidade: () => Promise.resolve([]),
    sincronizarVinculosRegistro: vi.fn(),
  },
}))
vi.mock('@/services/egressos', () => ({
  egressosService: {
    list: () =>
      Promise.resolve([
        {
          id: 9,
          nome: 'Egresso Ficticio Nove',
          ano_titulacao: 2023,
          atuacao_profissional: 'engenheiro de materiais em empresa ficticia',
          link_lattes: '',
        },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/docentes', () => ({
  docentesService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/lib/supabase/client', () => {
  const vazio = { data: [], error: null }
  const cadeia: any = {
    select: () => cadeia,
    order: () => cadeia,
    eq: () => cadeia,
    in: () => cadeia,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (res: (v: typeof vazio) => unknown) => Promise.resolve(vazio).then(res),
  }
  return { supabase: { from: () => cadeia, functions: { invoke: vi.fn() }, auth: {} } }
})

import LinhasPesquisa from './LinhasPesquisa'
import ImpactoSocialPage from './ImpactoSocial'
import Egressos from './Egressos'

afterEach(() => {
  cleanup()
  authState.role = 'coordenador'
  authState.docenteId = null
})

async function montar(el: React.ReactElement, esperar: string): Promise<string> {
  const { container } = render(<MemoryRouter>{el}</MemoryRouter>)
  await waitFor(() => expect(container.textContent, container.textContent ?? '').toContain(esperar))
  return container.innerHTML
}

describe('Linhas de Pesquisa: docente não vê a coluna Ações', () => {
  it('docente: sem o cabeçalho "Ações"', async () => {
    authState.role = 'docente'
    authState.docenteId = 3
    await montar(<LinhasPesquisa />, 'Linha Ficticia um')
    expect(document.body.textContent).not.toContain('Ações')
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s continua vendo "Ações"', async (papel) => {
    authState.role = papel
    await montar(<LinhasPesquisa />, 'Linha Ficticia um')
    expect(document.body.textContent).toContain('Ações')
  })
})

describe('Impacto Social: sem o ícone de "estrelinhas" (IA) no título do registro', () => {
  it('não renderiza o ícone Sparkles', async () => {
    const html = await montar(<ImpactoSocialPage />, 'Impacto Ficticio Cinco')
    expect(html).not.toContain('lucide-sparkles')
    expect(html).toContain('Impacto Ficticio Cinco')
  })
})

describe('Egressos: Atuação Profissional alinhada à esquerda', () => {
  it('a célula usa text-left e não centraliza o texto', async () => {
    const html = await montar(<Egressos />, 'Egresso Ficticio Nove')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const span = Array.from(doc.querySelectorAll('span')).find((s) =>
      (s.textContent || '').toLowerCase().includes('engenheiro de materiais'),
    )
    expect(span).toBeDefined()
    const td = span!.closest('td')!
    expect(td.className).toContain('text-left')
    expect(td.className).not.toContain('text-center')
    expect(span!.className).not.toContain('mx-auto')
  })
})
