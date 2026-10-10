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
  it('renderiza o card de Lacunas apontando para /lacunas com estado crítico em destaque vermelho', () => {
    const mockLacunasCriticas: ResultadoRelatorioLacunas = {
      sucesso: true,
      dados: {
        sucesso: true,
        gerado_em: '2025-05-10T12:00:00Z',
        ano_inicio: 2025,
        ano_fim: 2028,
        total_regras: 3,
        total_lacunas: 4,
        total_criticas: 3,
        total_atencao: 1,
        resumo: [
          {
            regra_id: 'docente_sem_scopus_id',
            descricao: 'Docente sem Scopus ID',
            severidade: 'critica',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 3,
            percentual_conformidade: 70,
          },
          {
            regra_id: 'docente_sem_openalex_id',
            descricao: 'Docente sem OpenAlex ID',
            severidade: 'atencao',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 1,
            percentual_conformidade: 90,
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
    expect(html).toContain('href="/lacunas"')
    expect(html).toContain('Lacunas de Dados')
    expect(html).toContain('border-red-300')
    expect(html).toContain('4 pendências')
    expect(html).toContain('3 críticas')
    expect(html).toContain('exigem atenção prioritária')
  })

  it('renderiza o card em destaque verde/positivo quando não houver lacunas críticas', () => {
    const mockLacunasZeradas: ResultadoRelatorioLacunas = {
      sucesso: true,
      dados: {
        sucesso: true,
        gerado_em: '2025-05-10T12:00:00Z',
        ano_inicio: 2025,
        ano_fim: 2028,
        total_regras: 1,
        total_lacunas: 0,
        total_criticas: 0,
        total_atencao: 0,
        resumo: [
          {
            regra_id: 'docente_sem_scopus_id',
            descricao: 'Docente sem Scopus ID',
            severidade: 'critica',
            grupo: 'Docentes',
            tabela: 'docentes',
            total_registros: 10,
            total_lacunas: 0,
            percentual_conformidade: 100,
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

    expect(html).toContain('data-testid="card-status-lacunas"')
    expect(html).toContain('href="/lacunas"')
    expect(html).toContain('border-emerald-200')
    expect(html).toContain('0 críticas')
    expect(html).toContain('Regular')
    expect(html).toContain('Todos os campos essenciais preenchidos')
  })

  it('mostra estado de erro discreto sem quebrar o Dashboard quando a consulta falhar', () => {
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

    expect(html).toContain('data-testid="card-status-lacunas"')
    expect(html).toContain('href="/lacunas"')
    expect(html).toContain('border-amber-200')
    expect(html).toContain('Indisponível')
    expect(html).toContain('Verificação pendente')
    expect(html).toContain('Falha temporária de rede no serviço de lacunas')
  })
})
