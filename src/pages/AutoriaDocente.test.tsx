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

// Dados fictícios. Docente 10 está vinculado às patentes 1 e 2 e à produção 7; o docente 20 à 3 e 8.
vi.mock('@/services/patentes', () => ({
  patentesService: {
    list: () =>
      Promise.resolve([
        { id: 1, titulo: 'Patente Minha', status: 'Pendente', autores: 'A', inpi: '1', tipo: null },
        {
          id: 2,
          titulo: 'Patente Compartilhada',
          status: 'Pendente',
          autores: 'A',
          inpi: '2',
          tipo: null,
        },
        {
          id: 3,
          titulo: 'Patente Alheia',
          status: 'Pendente',
          autores: 'B',
          inpi: '3',
          tipo: null,
        },
        {
          id: 4,
          titulo: 'Patente Orfa',
          status: 'Pendente',
          autores: 'C',
          inpi: '4',
          tipo: null,
        },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/producao-tecnica', () => ({
  producaoTecnicaService: {
    list: () =>
      Promise.resolve([
        { id: 7, titulo: 'Producao Minha', tipo: 'Software', ano: 2025, autores: 'A' },
        { id: 8, titulo: 'Producao Alheia', tipo: 'Software', ano: 2025, autores: 'B' },
        { id: 9, titulo: 'Producao Orfa', tipo: 'Software', ano: 2025, autores: 'C' },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/services/vinculos-docentes-registro', () => {
  const patentes = [
    { id: 1, patente_id: 1, docente_id: 10 },
    { id: 2, patente_id: 2, docente_id: 10 },
    { id: 3, patente_id: 2, docente_id: 20 },
    { id: 4, patente_id: 3, docente_id: 20 },
  ]
  const producoes = [
    { id: 1, producao_tecnica_id: 7, docente_id: 10 },
    { id: 2, producao_tecnica_id: 8, docente_id: 20 },
  ]
  return {
    patentesDocentesService: {
      listarTodos: () => Promise.resolve(patentes),
      sincronizarDocentes: vi.fn(),
    },
    producaoTecnicaDocentesService: {
      listarTodos: () => Promise.resolve(producoes),
      sincronizarDocentes: vi.fn(),
    },
  }
})
vi.mock('@/services/impacto-social', () => ({
  impactoSocialService: { list: () => Promise.resolve([]) },
}))
vi.mock('@/services/impactos-vinculos', () => ({
  impactosVinculosService: {
    listarPorEntidade: () => Promise.resolve([]),
    sincronizarVinculosRegistro: vi.fn(),
  },
}))
vi.mock('@/services/docentes', () => ({
  docentesService: { list: () => Promise.resolve([{ id: 10, nome: 'Docente Dez' }]) },
}))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: () => ({}), auth: {} } }))

import Patentes from './Patentes'
import ProducaoTecnica from './ProducaoTecnica'

afterEach(() => {
  cleanup()
  authState.role = 'coordenador'
  authState.docenteId = null
})

async function montar(el: React.ReactElement, esperar: string): Promise<HTMLElement> {
  const { container } = render(<MemoryRouter>{el}</MemoryRouter>)
  await waitFor(() => expect(container.textContent, container.textContent ?? '').toContain(esperar))
  return container
}

describe('Patentes: visão restrita do docente (D-27)', () => {
  it('docente vê só as patentes vinculadas a ele (próprias e compartilhadas)', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar(<Patentes />, 'Patente Minha')
    const texto = c.textContent || ''
    expect(texto).toContain('Patente Compartilhada')
    expect(texto).not.toContain('Patente Alheia')
    expect(texto).not.toContain('Patente Orfa')
  })

  it('docente pode criar (botão de novo registro) e tem a coluna Ações', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar(<Patentes />, 'Patente Minha')
    expect(c.textContent).toContain('Ações')
    expect(c.textContent).toMatch(/Novo\s+Patente/i)
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s vê todas as patentes', async (papel) => {
    authState.role = papel
    const c = await montar(<Patentes />, 'Patente Minha')
    for (const t of ['Patente Alheia', 'Patente Orfa']) expect(c.textContent).toContain(t)
  })

  it('docente sem cadastro vinculado não vê nenhuma', async () => {
    authState.role = 'docente'
    authState.docenteId = null
    const { container } = render(
      <MemoryRouter>
        <Patentes />
      </MemoryRouter>,
    )
    await new Promise((r) => setTimeout(r, 80))
    expect(container.textContent).not.toContain('Patente Minha')
  })
})

describe('Produção Técnica: visão restrita do docente (D-27)', () => {
  it('docente vê só as produções vinculadas a ele', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar(<ProducaoTecnica />, 'Producao Minha')
    expect(c.textContent).not.toContain('Producao Alheia')
    expect(c.textContent).not.toContain('Producao Orfa')
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s vê todas', async (papel) => {
    authState.role = papel
    const c = await montar(<ProducaoTecnica />, 'Producao Minha')
    for (const t of ['Producao Alheia', 'Producao Orfa']) expect(c.textContent).toContain(t)
  })
})
