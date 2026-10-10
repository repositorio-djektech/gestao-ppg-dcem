import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { ResultadoRelatorioLacunas } from '@/services/lacunas'

// Mock de supabase para os contadores do Dashboard
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ count: 10, error: null }),
    }),
  },
}))

describe('Dashboard — Card de Status Lacunas de Dados', () => {
  it('renderiza o card no Dashboard APENAS quando há pendências críticas (severidade crítica > 0)', () => {
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

    const html = renderToString(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasCriticas)} />
      </MemoryRouter>,
    )

    expect(html).toContain('data-testid="card-status-lacunas"')
    expect(html).toContain('Pendências de Dados')
    expect(html).toContain('border-red-300')
    expect(html).toContain('3 críticas')
    expect(html).toContain('3 pendências críticas de dados')
    expect(html).toContain('Revise e preencha os dados prioritários')
    expect(html).toContain('Clique para revisar no Relatório de Lacunas')
  })

  it('NÃO renderiza o card quando não houver pendências críticas (críticas zeradas)', () => {
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

    const html = renderToString(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockLacunasZeradas)} />
      </MemoryRouter>,
    )

    // Quando não houver pendências críticas, o card não aparece no Dashboard
    expect(html).not.toContain('data-testid="card-status-lacunas"')
    expect(html).not.toContain('Pendências de Dados')
  })

  it('não bloqueia nem quebra o Dashboard quando a consulta de lacunas falhar (card não aparece)', () => {
    const mockFalha: ResultadoRelatorioLacunas = {
      sucesso: false,
      dados: null,
      mensagemErro: 'Falha temporária de rede no serviço de lacunas',
    }

    const html = renderToString(
      <MemoryRouter>
        <Dashboard obterLacunasFn={() => Promise.resolve(mockFalha)} />
      </MemoryRouter>,
    )

    // O Dashboard continua normal com seus módulos principais sem exibir o card de lacunas críticas
    expect(html).toContain('Total de Registros')
    expect(html).toContain('Docentes')
    expect(html).not.toContain('data-testid="card-status-lacunas"')
  })
})
