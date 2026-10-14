import { describe, it, expect, vi } from 'vitest'
import { gravarDadosLattes } from './gravar'

describe('Etapa R3: Idempotência de vínculos e preservação manual', () => {
  it('grava vínculos de publicacoes_docentes e publicacoes_coautores sem duplicar em nova execução', async () => {
    // Simula banco em memória
    const publicacoesDb: any[] = []
    const publicacoesDocentesDb: any[] = []
    const publicacoesCoautoresDb: any[] = []
    const discentesDb: any[] = [
      { id: 101, nome: 'João Pedro Silva', orientador: '', docente_orientador_id: null },
    ]
    const orientacoesDb: any[] = []

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            return {
              eq: vi.fn().mockImplementation((field: string, val: any) => {
                if (table === 'publicacoes_docentes') {
                  const items = publicacoesDocentesDb.filter((r) => r[field] === val)
                  return Promise.resolve({ data: items, error: null })
                }
                if (table === 'publicacoes_coautores_programa') {
                  const items = publicacoesCoautoresDb.filter((r) => r[field] === val)
                  return Promise.resolve({ data: items, error: null })
                }
                if (table === 'discentes') {
                  const item = discentesDb.find((r) => r[field] === val)
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: item || null, error: null }),
                  }
                }
                return Promise.resolve({ data: [], error: null })
              }),
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
              ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
            }
          }),
          insert: vi.fn().mockImplementation((payload: any) => {
            const arr = Array.isArray(payload) ? payload : [payload]
            if (table === 'publicacoes') {
              const item = { id: 1, ...arr[0] }
              publicacoesDb.push(item)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: item, error: null }),
                }),
              }
            }
            if (table === 'publicacoes_docentes') {
              for (const p of arr) {
                publicacoesDocentesDb.push(p)
              }
              return Promise.resolve({ data: arr, error: null })
            }
            if (table === 'publicacoes_coautores_programa') {
              for (const p of arr) {
                publicacoesCoautoresDb.push(p)
              }
              return Promise.resolve({ data: arr, error: null })
            }
            if (table === 'orientacoes') {
              for (const p of arr) {
                orientacoesDb.push({ id: orientacoesDb.length + 1, ...p })
              }
              return Promise.resolve({ data: arr, error: null })
            }
            return Promise.resolve({ data: arr, error: null })
          }),
          update: vi.fn().mockImplementation((patch: any) => {
            return {
              eq: vi.fn().mockImplementation((field: string, val: any) => {
                if (table === 'discentes') {
                  const disc = discentesDb.find((d) => d[field] === val)
                  if (disc) Object.assign(disc, patch)
                }
                return Promise.resolve({ data: null, error: null })
              }),
            }
          }),
        }
      }),
    }

    const dadosImportacao = {
      publicacoes: [
        {
          titulo: 'Desenvolvimento de Novos Materiais Cerâmicos',
          autores: 'Barreto, L. S.; Silva, J. P.',
          periodico: 'Cerâmica Atual',
          ano: 2025,
          docentes_autores_ids: [1],
          coautores_programa: [
            {
              tipo: 'orientando' as const,
              discente_id: 101,
              nome: 'João Pedro Silva',
              grau_confianca: 0.95,
            },
          ],
        },
      ],
      orientacoes: [
        {
          docente_id: 1,
          discente_id: 101,
          discente_nome: 'João Pedro Silva',
          titulo_trabalho: 'Síntese e caracterização',
          ano: 2025,
          tipo: 'MESTRADO',
          status: 'em_andamento',
        },
      ],
    }

    // 1ª Execução
    await gravarDadosLattes(dadosImportacao as any, mockClient as any)

    expect(publicacoesDocentesDb.length).toBe(1)
    expect(publicacoesDocentesDb[0].docente_id).toBe(1)
    expect(publicacoesCoautoresDb.length).toBe(1)
    expect(publicacoesCoautoresDb[0].discente_id).toBe(101)
    expect(discentesDb[0].docente_orientador_id).toBe(1)

    // 2ª Execução (Reimportação do mesmo XML) — não deve duplicar
    await gravarDadosLattes(dadosImportacao as any, mockClient as any)

    expect(publicacoesDocentesDb.length).toBe(1)
    expect(publicacoesCoautoresDb.length).toBe(1)
  })

  it('preserva coautoria manual já gravada ou confirmada e preserva orientador existente', async () => {
    const discentesDb = [
      {
        id: 202,
        nome: 'Maria Fernandes',
        orientador: 'Prof. Orientador Já Existente',
        docente_orientador_id: 99, // Já tinha orientador confirmado manualmente
      },
    ]

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            return {
              eq: vi.fn().mockImplementation((field: string, val: any) => {
                if (table === 'discentes') {
                  const item = discentesDb.find((r) => r[field] === val)
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: item || null, error: null }),
                  }
                }
                return Promise.resolve({ data: [], error: null })
              }),
            }
          }),
          update: vi.fn().mockImplementation((patch: any) => {
            return {
              eq: vi.fn().mockImplementation((field: string, val: any) => {
                if (table === 'discentes') {
                  const item = discentesDb.find((r) => r[field] === val)
                  if (item) Object.assign(item, patch)
                }
                return Promise.resolve({ data: null, error: null })
              }),
            }
          }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    }

    const dadosImportacao = {
      orientacoes: [
        {
          docente_id: 1, // Tenta atribuir docente 1
          discente_id: 202,
          discente_nome: 'Maria Fernandes',
          titulo_trabalho: 'Tese de Doutorado',
          ano: 2026,
          tipo: 'DOUTORADO',
          status: 'em_andamento',
        },
      ],
    }

    await gravarDadosLattes(dadosImportacao as any, mockClient as any)

    // O orientador confirmado anteriormente (docente 99) NÃO deve ser sobrescrito!
    expect(discentesDb[0].docente_orientador_id).toBe(99)
    expect(discentesDb[0].orientador).toBe('Prof. Orientador Já Existente')
  })
})
