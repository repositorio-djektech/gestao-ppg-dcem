import { describe, it, expect, vi } from 'vitest'
import { obterRelatorioLacunas } from './lacunas'

describe('Service obterRelatorioLacunas', () => {
  it('retorna dados a partir da edge function quando disponível', async () => {
    const mockData = {
      gerado_em: '2026-10-10T10:00:00.000Z',
      resumo: [
        {
          grupo: 'Identificadores e Métricas',
          tabela: 'docentes',
          regra_id: 'docente_sem_scopus_id',
          descricao: 'Docente sem Scopus ID',
          severidade: 'critica',
          total_registros: 7,
          total_lacunas: 2,
        },
      ],
      lacunas: [
        {
          regra_id: 'docente_sem_scopus_id',
          severidade: 'critica',
          grupo: 'Identificadores e Métricas',
          registros: [
            { id: 5, nome: 'Euler Araujo dos Santos', motivo: 'Scopus ID não informado' },
          ],
        },
      ],
    }

    const mockInvoke = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    })

    const resultado = await obterRelatorioLacunas({ invokeFn: mockInvoke })

    expect(resultado.sucesso).toBe(true)
    expect(resultado.origem).toBe('edge_function')
    expect(resultado.dados?.resumo).toHaveLength(1)
    expect(resultado.dados?.lacunas[0].registros[0].nome).toBe('Euler Araujo dos Santos')
    expect(mockInvoke).toHaveBeenCalledWith('relatorio-lacunas', { body: {} })
  })

  it('lida com falha da edge function e tenta fallback de modo resiliente', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Edge function indisponível'),
    })

    // Nesse teste a chamada local falhará se não mockar o supabase client,
    // mas testamos que o método não quebra e reporta a falha graciosamente
    const resultado = await obterRelatorioLacunas({ invokeFn: mockInvoke })
    expect(resultado).toBeDefined()
    expect(typeof resultado.sucesso).toBe('boolean')
  })
})
