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

// Dados fictícios
vi.mock('@/services/orientacoes', () => ({
  orientacoesService: {
    list: () =>
      Promise.resolve([
        {
          id: 1,
          docente_id: 10,
          discente_id: 1,
          tipo: 'Mestrado',
          inicio: '2025-03-01',
          fim: '',
          status: 'ativo',
        },
        {
          id: 2,
          docente_id: 10,
          discente_id: 2,
          tipo: 'Doutorado',
          inicio: '2024',
          fim: '2026-12-31',
          status: 'ativo',
        },
        {
          id: 3,
          docente_id: 20,
          discente_id: 3,
          tipo: 'Mestrado',
          inicio: '2025-01-01',
          fim: '',
          status: 'ativo',
        },
        {
          id: 4,
          docente_id: 10,
          discente_id: 4,
          tipo: 'Mestrado',
          inicio: '',
          fim: '',
          status: 'ativo',
        },
      ]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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
        { id: 3, nome: 'Discente Tres' },
        { id: 4, nome: 'Discente Quatro' },
      ]),
  },
}))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: () => ({}), auth: {} } }))

import Orientacoes from './Orientacoes'

afterEach(() => {
  cleanup()
  authState.role = 'coordenador'
  authState.docenteId = null
})

async function montar(): Promise<HTMLElement> {
  const { container } = render(
    <MemoryRouter>
      <Orientacoes />
    </MemoryRouter>,
  )
  await waitFor(() => expect(container.textContent).toContain('Discente'))
  await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0))
  return container
}

const linha = (c: HTMLElement, nomeDiscente: string) =>
  Array.from(c.querySelectorAll('tbody tr')).find((tr) => tr.textContent?.includes(nomeDiscente))!

describe('Orientações: tabela', () => {
  it('Término é uma coluna da tabela', async () => {
    const c = await montar()
    const cabecalhos = Array.from(c.querySelectorAll('thead th')).map((th) => th.textContent)
    expect(cabecalhos).toEqual(expect.arrayContaining(['Início', 'Término', 'Status']))
    expect(cabecalhos.indexOf('Término')).toBe(cabecalhos.indexOf('Início') + 1)
  })

  it('Tipo vira badge, com cores diferentes para Mestrado e Doutorado', async () => {
    const c = await montar()
    const tipoDe = (nome: string) => linha(c, nome).querySelector('td')!.querySelector('span,div')!
    const mestrado = tipoDe('Discente Um')
    const doutorado = tipoDe('Discente Dois')
    expect(mestrado.textContent).toBe('Mestrado')
    expect(doutorado.textContent).toBe('Doutorado')
    expect(mestrado.className).not.toBe(doutorado.className)
    expect(mestrado.className).toContain('bg-')
    expect(doutorado.className).toContain('bg-')
  })

  it('mostra início e término formatados; sem data, o traço em Início, Término e Status', async () => {
    const c = await montar()
    const celulas = (nome: string) =>
      Array.from(linha(c, nome).querySelectorAll('td')).map((td) => td.textContent)

    // Discente Dois: início "2024" (ano) e término 31/12/2026
    expect(celulas('Discente Dois')).toEqual(expect.arrayContaining(['2024', '31/12/2026']))
    // Discente Um: início 01/03/2025 e término sem data -> traço
    const um = celulas('Discente Um')
    expect(um).toEqual(expect.arrayContaining(['01/03/2025', '—']))
    // Discente Quatro: sem início e sem término -> Início, Término e Status viram traço
    const quatro = celulas('Discente Quatro')
    expect(quatro.filter((t) => t === '—').length).toBe(3)
  })
})

describe('Orientações: visão restrita do docente (D-27)', () => {
  it('docente vê só as próprias orientações e coorientações', async () => {
    authState.role = 'docente'
    authState.docenteId = 10
    const c = await montar()
    const texto = c.textContent || ''
    expect(texto).toContain('Discente Um')
    expect(texto).toContain('Discente Dois')
    expect(texto).not.toContain('Discente Tres') // orientação de outro docente
  })

  it.each(['coordenador', 'suporte', 'auxiliar'])('%s vê todas', async (papel) => {
    authState.role = papel
    const c = await montar()
    expect(c.textContent).toContain('Discente Tres')
  })
})
