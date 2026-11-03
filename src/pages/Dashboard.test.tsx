import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { ResultadoRelatorioLacunas } from '@/services/lacunas'
import type { Role } from '@/types/database'

// Mock de useAuth
let mockRole: Role | null = 'coordenador'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    role: mockRole,
    isSuporte: mockRole === 'suporte',
    isCoordenador: mockRole === 'coordenador',
    isAuxiliar: mockRole === 'auxiliar',
    isDocente: mockRole === 'docente',
    isCapes: mockRole === 'capes',
    loading: false,
  }),
}))

// Mock de supabase para os contadores do Dashboard
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ count: 10, error: null }),
    }),
  },
}))

// O Dashboard carrega contadores e lacunas em efeitos assíncronos: renderiza e descarrega as
// promessas pendentes antes de inspecionar o HTML.
afterEach(cleanup)

async function renderPagina(el: React.ReactElement): Promise<string> {
  const { container } = render(el)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return container.innerHTML
}

describe('Dashboard — Card de Status Lacunas de Dados', () => {
  it('renderiza o card no Dashboard APENAS quando há pendências críticas (severidade crítica > 0)', async () => {
    const mockLacunasCriticas: ResultadoRelatorioLacunas = {
      sucesso: true,
      dados: {
        gerado_em: '2025-05-10T12:00:00Z',
        resumo: [
          {
            regra_id: 'docente_sem_scopus_id',
            descricao: 'Docente sem Scopus ID',
            severidade: 'critica',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 3,
          },
          {
            regra_id: 'docente_sem_openalex_id',
            descricao: 'Docente sem OpenAlex ID',
            severidade: 'atencao',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 1,
          },
        ],
        lacunas: [],
      },
      origem: 'edge_function',
    }

    const html = await renderPagina(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasCriticas)} />
      </MemoryRouter>,
    )

    expect(html).toContain('data-testid="card-status-lacunas"')
    expect(html).toContain('Pendências de Dados')
    expect(html).toContain('border-red-300')
    expect(html).toContain('3 pendências críticas de dados')
    // O badge de contagem (ex.: "3 críticas") foi removido conforme requisito
    expect(html).not.toContain('3 críticas')
    expect(html).toContain('Revise e preencha os dados prioritários')
    expect(html).toContain('Clique para revisar no Relatório de Lacunas')
  })

  it('NÃO renderiza o card quando não houver pendências críticas (críticas zeradas)', async () => {
    const mockLacunasZeradas: ResultadoRelatorioLacunas = {
      sucesso: true,
      dados: {
        gerado_em: '2025-05-10T12:00:00Z',
        resumo: [
          {
            regra_id: 'docente_sem_openalex_id',
            descricao: 'Docente sem OpenAlex ID',
            severidade: 'atencao',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 2,
          },
        ],
        lacunas: [],
      },
      origem: 'edge_function',
    }

    const html = await renderPagina(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasZeradas)} />
      </MemoryRouter>,
    )

    // Quando não houver pendências críticas, o card não aparece no Dashboard
    expect(html).not.toContain('data-testid="card-status-lacunas"')
    expect(html).not.toContain('Pendências de Dados')
  })

  it('não bloqueia nem quebra o Dashboard quando a consulta de lacunas falhar (card não aparece)', async () => {
    const mockFalha: ResultadoRelatorioLacunas = {
      sucesso: false,
      dados: null,
      mensagemErro: 'Falha temporária de rede no serviço de lacunas',
    }

    const html = await renderPagina(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockFalha)} />
      </MemoryRouter>,
    )

    // O Dashboard continua normal com seus módulos principais sem exibir o card de lacunas críticas
    expect(html).toContain('Dashboard')
    expect(html).not.toContain('Visão geral do preenchimento')
    expect(html).toContain('Total de Registros')
    expect(html).toContain('Docentes')
    expect(html).not.toContain('data-testid="card-status-lacunas"')
  })

  it('renderiza os cards do grupo Pessoas no Dashboard com tema rosa (pink-200, pink-500, pink-600)', async () => {
    const html = await renderPagina(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve({ sucesso: true, dados: null })} />
      </MemoryRouter>,
    )

    // Grupo Pessoas usa rosa
    expect(html).toContain('border-pink-200')
    expect(html).toContain('bg-pink-100')
    expect(html).toContain('text-pink-800')
    expect(html).toContain('text-pink-600')
    expect(html).toContain('bg-pink-500')

    // Acadêmico segue verde/esmeralda
    expect(html).toContain('border-emerald-200')
    expect(html).toContain('bg-emerald-500')
  })

  describe('Visibilidade por papel', () => {
    const mockLacunasCriticas: ResultadoRelatorioLacunas = {
      sucesso: true,
      dados: {
        gerado_em: '2025-05-10T12:00:00Z',
        resumo: [
          {
            regra_id: 'docente_sem_scopus_id',
            descricao: 'Docente sem Scopus ID',
            severidade: 'critica',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 5,
          },
        ],
        lacunas: [],
      },
      origem: 'edge_function',
    }

    it('NÃO exibe o card de Pendências de Dados para papel "docente" em nenhuma hipótese', async () => {
      mockRole = 'docente'
      const html = await renderPagina(
        <MemoryRouter>
          <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasCriticas)} />
        </MemoryRouter>,
      )

      expect(html).not.toContain('data-testid="card-status-lacunas"')
      expect(html).not.toContain('Pendências de Dados')
    })

    it.each<Role>(['suporte', 'coordenador', 'auxiliar', 'capes'])(
      'exibe o card de Pendências de Dados para papel "%s" quando houver críticas',
      async (papelPermitido) => {
        mockRole = papelPermitido
        const html = await renderPagina(
          <MemoryRouter>
            <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasCriticas)} />
          </MemoryRouter>,
        )

        expect(html).toContain('data-testid="card-status-lacunas"')
        expect(html).toContain('Pendências de Dados')
        // E o badge de contagem ("5 críticas") NÃO deve existir
        expect(html).not.toContain('5 críticas')
      },
    )
  })
})
