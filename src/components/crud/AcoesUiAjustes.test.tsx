import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CrudPage } from './CrudPage'
import type { ColumnDef } from './types'

// Mock de hooks e dependências externas
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', role: 'coordenador', email: 'coord@ufs.br' },
    role: 'coordenador',
    docenteIdLogado: null,
  }),
}))

vi.mock('@/hooks/use-crud-data', () => ({
  useCrudData: () => ({
    data: [
      { id: '1', titulo: 'Projeto Teste 1' },
      { id: '2', titulo: 'Projeto Teste 2' },
    ],
    loading: false,
    error: null,
    fetchData: vi.fn(),
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}))

describe('Ajustes de UI - Coluna Ações e Larguras (Critérios de Aceite)', () => {
  it('CrudPage: renderiza cabeçalho "Ações" com alinhamento text-left e células com text-center e justify-center gap-2', () => {
    const columns: ColumnDef<{ id: string; titulo: string }>[] = [
      { key: 'titulo', label: 'Título' },
    ]

    const html = renderToString(
      <CrudPage<{ id: string; titulo: string }>
        title="Projetos de Pesquisa"
        entityName="Projeto"
        columns={columns}
        fields={[]}
        service={{
          list: vi.fn().mockResolvedValue([]),
          getById: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
          remove: vi.fn(),
        }}
        tableName="projetos_pesquisa"
        emptyForm={{ id: '', titulo: '' }}
        searchKey="titulo"
      />,
    )

    // Cabeçalho Ações alinhado à esquerda
    expect(html).toContain('text-left')
    expect(html).toContain('Ações')

    // Células de Ações centralizadas com flex justify-center gap-2
    expect(html).toContain('justify-center gap-2')
    expect(html).toContain('text-center')
  })
})
