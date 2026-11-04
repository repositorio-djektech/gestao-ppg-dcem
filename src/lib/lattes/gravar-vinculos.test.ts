import { describe, it, expect, vi } from 'vitest'
import { gravarDadosLattes } from './gravar'
import { criarClienteFake } from '@/test/fake-supabase'

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

  describe('H-01/H-02 — o import só define orientador principal a partir de orientação principal', () => {
    function criarMock(discentesDb: any[]) {
      return {
        from: vi.fn().mockImplementation((table: string) => ({
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((field: string, val: any) => {
              if (table === 'discentes') {
                const item = discentesDb.find((r) => r[field] === val)
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: item || null, error: null }),
                }
              }
              return Promise.resolve({ data: [], error: null })
            }),
          })),
          update: vi.fn().mockImplementation((patch: any) => ({
            eq: vi.fn().mockImplementation((field: string, val: any) => {
              if (table === 'discentes') {
                const item = discentesDb.find((r) => r[field] === val)
                if (item) Object.assign(item, patch)
              }
              return Promise.resolve({ data: null, error: null })
            }),
          })),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      }
    }

    it('coorientação (flag_orientador_principal=false) NÃO define o docente como orientador principal', async () => {
      const discentesDb = [
        { id: 301, nome: 'Discente Ficticio Tres', orientador: '', docente_orientador_id: null },
      ]
      await gravarDadosLattes(
        {
          orientacoes: [
            {
              docente_id: 1,
              discente_id: 301,
              discente_nome: 'Discente Ficticio Tres',
              ano: 2026,
              tipo: 'MESTRADO',
              status: 'em_andamento',
              flag_orientador_principal: false,
            },
          ],
        } as any,
        criarMock(discentesDb) as any,
      )
      expect(discentesDb[0].docente_orientador_id).toBeNull()
      expect(discentesDb[0].orientador).toBe('')
    })

    it('orientação principal continua definindo o orientador quando o discente não tem um', async () => {
      const discentesDb = [
        { id: 302, nome: 'Discente Ficticio Quatro', orientador: '', docente_orientador_id: null },
      ]
      await gravarDadosLattes(
        {
          orientacoes: [
            {
              docente_id: 1,
              discente_id: 302,
              discente_nome: 'Discente Ficticio Quatro',
              ano: 2026,
              tipo: 'MESTRADO',
              status: 'em_andamento',
              flag_orientador_principal: true,
            },
          ],
        } as any,
        criarMock(discentesDb) as any,
      )
      expect(discentesDb[0].docente_orientador_id).toBe(1)
    })
  })

  describe('P-15 — falha ao criar o discente no import não pode gerar orientação órfã em silêncio', () => {
    const dados = {
      orientacoes: [
        {
          docente_id: 1,
          discente_nome: 'Discente Ficticio Cinco',
          ano: 2026,
          tipo: 'MESTRADO',
          status: 'em_andamento',
          flag_orientador_principal: true,
        },
      ],
    }

    it('quando o INSERT do discente é barrado (ex.: RLS), a orientação NÃO é gravada sem discente e o erro é reportado', async () => {
      const { client, tabelas } = criarClienteFake(
        { discentes: [], orientacoes: [], docentes: [{ id: 1, nome: 'Docente Alfa Teste', id_lattes: '' }] },
        {
          erroEm: {
            tabela: 'discentes',
            op: 'insert',
            mensagem: 'new row violates row-level security policy',
          },
        },
      )
      const rel = await gravarDadosLattes(dados as any, client)

      expect(tabelas.orientacoes).toHaveLength(0)
      expect(rel.orientacoes.ignorados).toBe(1)
      const erro = rel.erros.find((e) => e.tabela === 'orientacoes')
      expect(erro).toBeDefined()
      expect(erro!.mensagem).toMatch(/discente/i)
      expect(erro!.mensagem).toMatch(/row-level security/i)
      expect(erro!.item).toContain('Discente Ficticio Cinco')
    })

    it('quando o discente é criado normalmente (sem orientador), a orientação é gravada com o discente', async () => {
      const { client, tabelas } = criarClienteFake({
        discentes: [],
        orientacoes: [],
        docentes: [{ id: 1, nome: 'Docente Alfa Teste', id_lattes: '' }],
      })
      const rel = await gravarDadosLattes(dados as any, client)

      expect(tabelas.discentes).toHaveLength(1)
      expect(tabelas.orientacoes).toHaveLength(1)
      expect(tabelas.orientacoes[0].discente_id).toBe(tabelas.discentes[0].id)
      expect(rel.erros.filter((e) => e.tabela === 'orientacoes')).toHaveLength(0)
    })
  })

  it('pipeline Lattes não grava em disciplinas nem em disciplinas_docentes, preservando preenchimento manual', async () => {
    const disciplinasDb = [{ id: 1, nome: 'Disciplina Manual Existente', codigo: 'MAN001' }]
    const disciplinasDocentesDb = [{ disciplina_id: 1, docente_id: 10 }]

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'disciplinas' || table === 'disciplinas_docentes') {
          throw new Error(`A tabela ${table} não deve ser acessada na importação Lattes!`)
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }

    const dadosImportacao = {
      disciplinas: [
        {
          nome: 'Nova Disciplina do Lattes',
          codigo: 'LAT001',
          ano: 2025,
          docente_id: 10,
        },
      ],
      publicacoes: [],
      orientacoes: [],
    }

    // A gravação de disciplinas deve ser no-op e não tocar nas tabelas disciplinas/disciplinas_docentes
    const relatorio = await gravarDadosLattes(dadosImportacao as any, mockClient as any)

    expect(relatorio.disciplinas?.ignorados).toBe(1)
    expect(relatorio.disciplinas?.inseridos).toBe(0)
    expect(disciplinasDb.length).toBe(1)
    expect(disciplinasDocentesDb.length).toBe(1)
  })
})
