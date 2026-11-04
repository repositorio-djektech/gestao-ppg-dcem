import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const authState = vi.hoisted(() => ({
  role: 'coordenador' as string | null,
  docenteId: null as number | null,
  loading: false,
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    role: authState.role,
    loading: authState.loading,
    profile: { id: 'u1', role: authState.role, docente_id: authState.docenteId },
  }),
}))

// Dados fictícios
vi.mock('@/services/orientacoes', () => ({
  orientacoesService: {
    list: () =>
      Promise.resolve([
        {
          id: 1,
          tipo: 'Mestrado',
          docente_id: 10,
          discente_id: 1,
          inicio: '2025',
          fim: '',
          status: 'ativo',
        },
        {
          id: 2,
          tipo: 'Doutorado',
          docente_id: 20,
          discente_id: 2,
          inicio: '2025',
          fim: '',
          status: 'ativo',
        },
      ]),
  },
}))
vi.mock('@/services/docentes', () => ({
  docentesService: {
    list: () =>
      Promise.resolve([
        { id: 10, nome: 'Docente Dez' },
        { id: 20, nome: 'Docente Vinte' },
      ]),
  },
}))
vi.mock('@/services/discentes', () => ({
  discentesService: {
    list: () =>
      Promise.resolve([
        { id: 1, nome: 'Discente Um' },
        { id: 2, nome: 'Discente Dois' },
      ]),
  },
}))
vi.mock('@/services/egressos', () => ({ egressosService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/disciplinas', () => ({
  disciplinasService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/projetos-pesquisa', () => ({
  projetosPesquisaService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/publicacoes', () => ({
  publicacoesService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/producao-tecnica', () => ({
  producaoTecnicaService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/patentes', () => ({ patentesService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/eventos', () => ({ eventosService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/mobilidade', () => ({ mobilidadeService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/impacto-social', () => ({
  impactoSocialService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/premiacoes', () => ({ premiacoesService: { list: () => Promise.resolve([]) } }))
vi.mock('@/services/publicacoes-docentes', () => ({
  publicacoesDocentesService: { listarTodos: () => Promise.resolve([]) },
}))
vi.mock('@/services/vinculos-docentes-registro', () => ({
  patentesDocentesService: { listarTodos: () => Promise.resolve([]) },
  producaoTecnicaDocentesService: { listarTodos: () => Promise.resolve([]) },
}))
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))

import PrintView from './PrintView'

afterEach(() => {
  cleanup()
  authState.role = 'coordenador'
  authState.docenteId = null
  authState.loading = false
})

async function imprimir(modulo: string, esperar: string): Promise<string> {
  const { container } = render(
    <MemoryRouter initialEntries={[`/imprimir/${modulo}`]}>
      <Routes>
        <Route path="/imprimir/:modulo" element={<PrintView />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(container.textContent, container.textContent ?? '').toContain(esperar))
  return container.textContent || ''
}

describe('Impressão: visão restrita do docente', () => {
  it('docente imprime só as próprias orientações', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const texto = await imprimir('orientacoes', 'Discente Um')
    expect(texto).not.toContain('Discente Dois')
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s imprime todas', async (papel) => {
    authState.role = papel
    const texto = await imprimir('orientacoes', 'Discente Um')
    expect(texto).toContain('Discente Dois')
  })
})
